import { rest, supabase } from "./supabase";
import type { Database } from "../integrations/supabase/types";

type ItemRequestRow = Database["public"]["Tables"]["item_requests"]["Row"];
type RequestStatus = Database["public"]["Enums"]["request_status"];

export type AttrItem = { name: string; value: string; unit?: string; confidence?: number };

export type ReviewStep = 1 | 2 | 3;

export function getCurrentReviewStep(status: RequestStatus | null): ReviewStep | null {
  if (!status) return null;
  if ([
    "PENDING_AI_REVIEW", "AI_PROCESSING", "AI_ESCALATED",
    "MANUAL_REVIEW_AFTER_AI", "AI_ESCALATED_TO_REQUESTER", "PENDING_REVIEW_1",
  ].includes(status)) return 1;
  if (status === "PENDING_REVIEW_2") return 2;
  if (status === "PENDING_REVIEW_3") return 3;
  return null;
}

export function getNextStatus(status: RequestStatus | null): RequestStatus | null {
  const step = getCurrentReviewStep(status);
  if (step === 1) return "PENDING_REVIEW_2";
  if (step === 2) return "PENDING_REVIEW_3";
  if (step === 3) return "APPROVED";
  return null;
}

export type ActionResult =
  | { ok: true; nextStatus: RequestStatus; itemCode?: string | null }
  | { ok: false; reason: "version_conflict" | "rpc_error" | "validation"; message: string };

/** 검토자 권한 검사 — is_team_reviewer_for_request RPC */
export async function checkTeamReviewer(userId: string, requestId: string, step: ReviewStep): Promise<boolean> {
  try {
    const res = await rest<unknown>("POST", "rpc/is_team_reviewer_for_request", {
      body: { p_user_id: userId, p_request_id: requestId, p_stage: step },
    });
    return res === true;
  } catch (e) {
    console.warn("[checkTeamReviewer] failed:", e);
    return false;
  }
}

/** 승인 액션 — 다음 단계 진입.
 *  최종 승인이면 generate_item_code RPC + erp_interface_items 분배.
 *  is_v2_test=true 행은 트리거 가드로 items/ERP 진입 차단되므로 클라이언트도 ERP INSERT 스킵 (격리).
 */
export type ApproveInput = {
  request: ItemRequestRow;
  userId: string;
  comment: string | null;
  editedAttributes?: AttrItem[];
  editedFields?: Partial<Pick<ItemRequestRow,
    "item_name" | "normalized_name" | "equipment_name" | "maker" | "model"
    | "unit" | "spec" | "large_category" | "medium_category" | "small_category"
  >>;
  erpFields?: { item_account_code: string | null; item_class_code: string | null; stock_unit_code: string | null };
};

export async function approveRequest(input: ApproveInput): Promise<ActionResult> {
  const { request, userId, comment, editedAttributes, editedFields, erpFields } = input;
  const step = getCurrentReviewStep(request.status as RequestStatus);
  const nextStatus = getNextStatus(request.status as RequestStatus);
  if (!step || !nextStatus) return { ok: false, reason: "validation", message: "현재 단계를 식별할 수 없습니다" };

  const currentAttrs: AttrItem[] = Array.isArray(request.attributes)
    ? (request.attributes as unknown as AttrItem[])
    : [];
  const finalAttrs = editedAttributes && editedAttributes.length > 0 ? editedAttributes : currentAttrs;

  const resolvedFields = {
    item_name: editedFields?.item_name ?? request.item_name,
    normalized_name: editedFields?.normalized_name ?? request.normalized_name,
    equipment_name: editedFields?.equipment_name ?? request.equipment_name,
    maker: editedFields?.maker ?? request.maker,
    model: editedFields?.model ?? request.model,
    unit: editedFields?.unit ?? request.unit,
    spec: editedFields?.spec ?? request.spec,
    large_category: editedFields?.large_category ?? request.large_category,
    medium_category: editedFields?.medium_category ?? request.medium_category,
    small_category: editedFields?.small_category ?? request.small_category,
  };

  let itemCode: string | null = null;
  if (nextStatus === "APPROVED") {
    try {
      const code = await rest<string>("POST", "rpc/generate_item_code", {
        body: {
          p_request_id: request.id,
          p_large_category: resolvedFields.large_category || "",
          p_medium_category: resolvedFields.medium_category || "",
          p_small_category: resolvedFields.small_category || "",
          p_equipment_name: resolvedFields.equipment_name || "",
          p_maker: resolvedFields.maker || "",
          p_model: resolvedFields.model || "",
          p_parent_item_id: (request as unknown as { parent_item_id: string | null }).parent_item_id ?? null,
        },
      });
      itemCode = typeof code === "string" ? code : null;
    } catch (e) {
      return { ok: false, reason: "rpc_error", message: `품목코드 생성 실패: ${(e as Error).message}` };
    }
  }

  const currentVersion = (request as unknown as { version: number | null }).version ?? 1;
  const updateBody: Record<string, unknown> = {
    status: nextStatus,
    [`reviewer_${step}_id`]: userId,
    [`review_${step}_at`]: new Date().toISOString(),
    [`review_${step}_comment`]: comment ?? null,
    attributes: finalAttrs,
    ...resolvedFields,
    version: currentVersion + 1,
  };
  if (erpFields) {
    updateBody.item_account_code = erpFields.item_account_code;
    updateBody.item_class_code = erpFields.item_class_code;
    updateBody.stock_unit_code = erpFields.stock_unit_code;
  }
  if (itemCode) updateBody.item_code = itemCode;

  let updated: Array<{ id: string }>;
  try {
    updated = await rest<Array<{ id: string }>>("PATCH", "item_requests", {
      params: {
        id: `eq.${request.id}`,
        version: `eq.${currentVersion}`,
        select: "id",
      },
      body: updateBody,
      prefer: "return=representation",
    });
  } catch (e) {
    return { ok: false, reason: "rpc_error", message: `승인 실패: ${(e as Error).message}` };
  }
  if (!updated || updated.length === 0) {
    return { ok: false, reason: "version_conflict", message: "수정 충돌 — 다른 사용자가 이미 처리. 새로고침 후 재시도." };
  }

  // changeLog (편집 diff)
  const logs: Array<Record<string, unknown>> = [];
  for (const [k, v] of Object.entries(resolvedFields)) {
    const old = (request as unknown as Record<string, unknown>)[k] ?? "";
    if (String(old) !== String(v ?? "")) {
      logs.push({
        item_request_id: request.id, review_step: step, reviewer_id: userId,
        field_name: k, old_value: String(old), new_value: String(v ?? ""),
      });
    }
  }
  if (logs.length > 0) {
    try { await rest("POST", "review_change_logs", { body: logs }); } catch (e) { console.warn("[approve] log fail:", e); }
  }

  // 최종 승인 + v2_test 아닐 때만 ERP 분배
  const isV2Test = (request as unknown as { is_v2_test: boolean | null }).is_v2_test === true;
  if (nextStatus === "APPROVED" && itemCode && !isV2Test) {
    try {
      const erps = await rest<Array<{ code: string }>>("GET", "target_erp_systems", {
        params: { select: "code", is_active: "eq.true", order: "sort_order.asc" },
      });
      if (erps && erps.length > 0) {
        const rows = erps.map((e) => ({
          item_request_id: request.id,
          item_code: itemCode,
          item_name: resolvedFields.item_name,
          normalized_name: resolvedFields.normalized_name,
          large_category: resolvedFields.large_category,
          medium_category: resolvedFields.medium_category,
          small_category: resolvedFields.small_category,
          maker: resolvedFields.maker,
          model: resolvedFields.model,
          spec: resolvedFields.spec,
          unit: resolvedFields.unit,
          equipment_name: resolvedFields.equipment_name,
          attributes: finalAttrs,
          target_erp: e.code,
          interface_status: "PENDING",
        }));
        await rest("POST", "erp_interface_items", { body: rows });
      }
    } catch (e) { console.warn("[approve] erp distribute fail:", e); }
  }

  return { ok: true, nextStatus, itemCode };
}

/** 반려 액션 — status REJECTED + rejection_reason. comment 필수 */
export async function rejectRequest(input: {
  request: ItemRequestRow; userId: string; comment: string;
}): Promise<ActionResult> {
  const { request, userId, comment } = input;
  if (!comment.trim()) return { ok: false, reason: "validation", message: "반려 사유를 입력하세요" };
  const step = getCurrentReviewStep(request.status as RequestStatus);
  if (!step) return { ok: false, reason: "validation", message: "현재 단계를 식별할 수 없습니다" };
  const currentVersion = (request as unknown as { version: number | null }).version ?? 1;

  try {
    const updated = await rest<Array<{ id: string }>>("PATCH", "item_requests", {
      params: { id: `eq.${request.id}`, version: `eq.${currentVersion}`, select: "id" },
      body: {
        status: "REJECTED",
        rejected_at: new Date().toISOString(),
        rejection_reason: comment,
        [`reviewer_${step}_id`]: userId,
        [`review_${step}_at`]: new Date().toISOString(),
        [`review_${step}_comment`]: comment,
        version: currentVersion + 1,
      },
      prefer: "return=representation",
    });
    if (!updated || updated.length === 0) {
      return { ok: false, reason: "version_conflict", message: "수정 충돌. 새로고침 후 재시도." };
    }
    return { ok: true, nextStatus: "REJECTED" };
  } catch (e) {
    return { ok: false, reason: "rpc_error", message: `반려 실패: ${(e as Error).message}` };
  }
}

/** 보완요청 (2/3차 검토자가 신청자에게 되돌림) — escalate_to_requester RPC */
export async function escalateToRequester(input: {
  request: ItemRequestRow; comment: string;
}): Promise<ActionResult> {
  const { request, comment } = input;
  if (!comment.trim() || comment.trim().length < 5) {
    return { ok: false, reason: "validation", message: "보완 사유를 5자 이상 입력하세요" };
  }
  const expectedVersion = (request as unknown as { version: number | null }).version ?? null;

  try {
    const data = await rest<{ ok?: boolean; message?: string } | null>("POST", "rpc/escalate_to_requester", {
      body: {
        p_request_id: request.id,
        p_reason: comment,
        p_expected_version: expectedVersion,
      },
    });
    if (!data?.ok) {
      return { ok: false, reason: "rpc_error", message: data?.message ?? "보완 요청 실패" };
    }
    return { ok: true, nextStatus: "AI_ESCALATED_TO_REQUESTER" };
  } catch (e) {
    return { ok: false, reason: "rpc_error", message: `보완 요청 실패: ${(e as Error).message}` };
  }
}

// supabase는 functions invoke용으로 남겨둠 (현재 액션은 모두 rest)
void supabase;
