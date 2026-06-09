import { supabase, rest } from "./supabase";

export type AICategory = {
  large: string;
  medium: string;
  small: string;
  confidence: number;
  source?: "ai" | "manual";
};

export type AIAttribute = {
  id?: string;
  name: string;
  value: string;
  unit: string;
  confidence: number;
};

export type AISuggestedItem = {
  code: string;
  name: string;
  similarity: number;
  reason: string;
};

export type AIAnalysisResult = {
  categories: AICategory[];
  attributes: AIAttribute[];
  duplicateRisk: { score: number; reason: string };
  suggestedItems: AISuggestedItem[];
  normalizedName: string;
};

export type CompanyOption = { id: string; code: string; name: string };
export type SiteOption = { id: string; code: string; name: string; company_id: string };
export type UnitOption = { id: string; code: string; name: string };
export type MakerOption = { id: string; name: string };

/** Supabase Edge Function: analyze-item 호출 */
export async function callAnalyzeItem(input: {
  itemName: string;
  maker?: string;
  model?: string;
  spec?: string;
}): Promise<AIAnalysisResult> {
  const { data, error } = await supabase.functions.invoke<AIAnalysisResult>(
    "analyze-item",
    { body: input },
  );
  if (error) {
    const ctx = (error as { context?: { response?: Response } }).context;
    const status = ctx?.response?.status;
    let bodyText = "";
    try { bodyText = (await ctx?.response?.text()) ?? ""; } catch { /* ignore */ }
    throw new Error(`[${status ?? "?"}] ${bodyText || error.message || "AI 분석 실패"}`);
  }
  if (!data) throw new Error("AI 분석 응답이 비어 있습니다");
  return data;
}

/** 마스터 데이터 — 회사 / 사이트 / 단위 / 제조사 (rest 헬퍼 사용) */
export async function fetchMasters(): Promise<{
  companies: CompanyOption[];
  sites: SiteOption[];
  units: UnitOption[];
  makers: MakerOption[];
}> {
  const [companies, sites, units, makers] = await Promise.all([
    rest<CompanyOption[]>("GET", "companies", { params: { select: "id,code,name", is_active: "eq.true", order: "code.asc" } }),
    rest<SiteOption[]>("GET", "sites", { params: { select: "id,code,name,company_id", is_active: "eq.true", order: "code.asc" } }),
    rest<UnitOption[]>("GET", "units", { params: { select: "id,code,name", is_active: "eq.true", order: "code.asc" } }),
    rest<MakerOption[]>("GET", "makers", { params: { select: "id,name", is_active: "eq.true", order: "name.asc" } }),
  ]);
  return { companies, sites, units, makers };
}

/** 신규 제조사 등록 — makers INSERT (rest), code는 트리거 자동생성 */
export async function createMaker(name: string): Promise<MakerOption> {
  const arr = await rest<MakerOption[]>("POST", "makers", {
    params: { select: "id,name" },
    body: { name, is_active: true },
    prefer: "return=representation",
  });
  return arr[0];
}

/** 임시저장 (DRAFT) — item_requests INSERT. status는 default 'DRAFT'.
 *  request_number는 generate_request_number 트리거가 자동 부여.
 *  DRAFT는 ERP 트리거·검토 워크플로우 어디에도 진입 안 함 (안전).
 */
export type DraftInput = {
  requesterId: string;
  itemName: string;
  maker?: string | null;
  model?: string | null;
  companyId?: string | null;
  siteId?: string | null;
  equipmentName?: string | null;
  unit?: string | null;
  spec?: string | null;
  notes?: string | null;
  additionalInfo?: string | null;
  imageUrls?: string[];
  documentUrls?: string[];
};

/** Supabase Storage 업로드 — v1 동일 패턴 (item-request-files 버킷) */
export const STORAGE_BUCKET = "item-request-files";

export async function uploadAttachmentFiles(
  userId: string,
  imageFiles: File[],
  docFiles: File[],
): Promise<{ imageUrls: string[]; documentUrls: string[] }> {
  const imageUrls: string[] = [];
  const documentUrls: string[] = [];

  for (const f of imageFiles) {
    const filePath = `${userId}/${Date.now()}_${f.name}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, f);
    if (error) { console.warn("[upload] image fail:", f.name, error.message); continue; }
    imageUrls.push(filePath);
  }
  for (const f of docFiles) {
    const filePath = `${userId}/${Date.now()}_${f.name}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, f);
    if (error) { console.warn("[upload] doc fail:", f.name, error.message); continue; }
    documentUrls.push(filePath);
  }
  return { imageUrls, documentUrls };
}

/** Storage signed URL 생성 — 첨부 미리보기용 */
export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}
export async function saveDraft(input: DraftInput, existingId?: string | null): Promise<{ id: string; request_number: string }> {
  const payload = {
    requester_id: input.requesterId,
    item_name: input.itemName,
    maker: input.maker ?? null,
    model: input.model ?? null,
    company_id: input.companyId ?? null,
    site_id: input.siteId ?? null,
    equipment_name: input.equipmentName ?? null,
    unit: input.unit ?? null,
    spec: input.spec ?? null,
    notes: input.notes ?? null,
    additional_info: input.additionalInfo ?? null,
    image_urls: input.imageUrls ?? [],
    document_urls: input.documentUrls ?? [],
    status: "DRAFT" as const,
  };
  if (existingId) {
    const arr = await rest<Array<{ id: string; request_number: string }>>(
      "PATCH",
      "item_requests",
      { params: { id: `eq.${existingId}`, select: "id,request_number" }, body: payload, prefer: "return=representation" },
    );
    return arr[0];
  }
  const arr = await rest<Array<{ id: string; request_number: string }>>(
    "POST",
    "item_requests",
    { params: { select: "id,request_number" }, body: { ...payload, request_number: "PENDING_GEN" }, prefer: "return=representation" },
  );
  return arr[0];
}

/** 제출 — DRAFT를 PENDING_AI_REVIEW로 전환 + ai-review-agent 호출
 *  v2 격리: is_v2_test=true로 설정 (트리거 가드로 items/ERP 큐 미진입)
 */
export type SubmitInput = {
  draftId: string;            // 기존 DRAFT id (saveDraft 결과)
  version: number;            // 낙관적 잠금
  smallCategoryId: string | null;  // 소분류 ID (compute_normalized_name용)
  smallCategoryName: string | null;  // 소분류 명 (check_duplicate용)
  largeCategory: string | null;
  mediumCategory: string | null;
  maker: string | null;
  model: string | null;
  spec: string | null;
  equipmentName: string | null;
  attributes: Array<{ name: string; value: string }>;  // 5속성
  confirmSoft?: boolean;       // 소프트 중복 경고를 확인하고 진행할 때 true
};
export type DuplicateCandidate = {
  item_code: string;
  item_code_display?: string;
  item_name: string;
  normalized_name: string;
  model?: string | null;
  match_type: string;
  severity: number;
  variant_candidate?: boolean;
};
export type SubmitResult = {
  ok: true;
  requestNumber: string;
  normalizedName: string | null;
} | {
  ok: false;
  blocked: "duplicate" | "soft_duplicate" | "version_conflict";
  candidates?: DuplicateCandidate[];
  message: string;
};

const MATCH_LABEL: Record<string, string> = {
  max_exact: "완전 일치",
  normalized_similar: "표준명 유사",
  model_spec_normalized: "모델·규격 일치",
  model_only: "동일 모델",
};
export function dupMatchLabel(t: string): string { return MATCH_LABEL[t] ?? t; }

export async function submitRequest(input: SubmitInput): Promise<SubmitResult> {
  // 1) 표준명 계산
  let normalizedName: string | null = null;
  if (input.smallCategoryId) {
    try {
      const arr = await rest<string | null>("POST", "rpc/compute_normalized_name_for", {
        body: {
          p_small_category_id: input.smallCategoryId,
          p_maker: input.maker,
          p_model: input.model,
          p_spec: input.spec,
          p_equipment_name: input.equipmentName,
          p_attributes: input.attributes,
        },
      });
      // rest는 array 가정이라 단일 string 응답은 unknown으로 처리
      normalizedName = typeof arr === "string" ? arr : (arr as unknown as { result?: string })?.result ?? null;
    } catch (e) {
      console.warn("[submit] compute_normalized_name_for failed:", e);
    }
  }

  // 2) 중복 검사 — 하드(max_exact 동일) 차단 / 소프트(유사·모델 등) 확인 요청
  if (input.smallCategoryName) {
    try {
      const candidates = await rest<DuplicateCandidate[]>("POST", "rpc/check_item_duplicate", {
        body: {
          p_small_category: input.smallCategoryName,
          p_normalized_name: normalizedName, // null이어도 max_exact/model 티어는 동작
          p_model: input.model,
          p_exclude_item_id: null,
          p_spec: input.spec,
          p_maker: input.maker,
          p_attributes: input.attributes,
        },
      });
      // 하드: 최대키 완전일치(변형 아님) → 차단
      const hard = candidates.filter((c) => c.match_type === "max_exact" && !c.variant_candidate);
      if (hard.length > 0) {
        return {
          ok: false,
          blocked: "duplicate",
          candidates: hard,
          message: `동일 품목이 이미 존재합니다: ${hard[0].item_code}`,
        };
      }
      // 소프트: 유사표준명/모델·규격/동일모델 → 사용자 확인 후 진행
      const soft = candidates.filter((c) => c.match_type !== "max_exact");
      if (soft.length > 0 && !input.confirmSoft) {
        return {
          ok: false,
          blocked: "soft_duplicate",
          candidates: soft,
          message: `유사 품목 ${soft.length}건이 발견됐습니다. 확인 후 진행하세요.`,
        };
      }
    } catch (e) {
      console.warn("[submit] check_item_duplicate failed:", e);
    }
  }

  // 3) item_requests UPDATE (DRAFT → PENDING_AI_REVIEW + is_v2_test=true)
  type Updated = { id: string; request_number: string };
  let updated: Updated[];
  try {
    updated = await rest<Updated[]>("PATCH", "item_requests", {
      params: {
        id: `eq.${input.draftId}`,
        version: `eq.${input.version}`,
        select: "id,request_number",
      },
      body: {
        status: "PENDING_AI_REVIEW",
        is_v2_test: true,
        normalized_name: normalizedName,
        large_category: input.largeCategory,
        medium_category: input.mediumCategory,
        attributes: input.attributes,
        version: input.version + 1,
      },
      prefer: "return=representation",
    });
  } catch (e) {
    return { ok: false, blocked: "version_conflict", message: `제출 실패: ${(e as Error).message}` };
  }
  if (!updated || updated.length === 0) {
    return { ok: false, blocked: "version_conflict", message: "수정 충돌 (다른 곳에서 이미 수정됨). 새로고침 후 재시도." };
  }

  // 4) ai-review-agent 호출 (실패해도 silent — 검토자 수동 처리 가능)
  try {
    await supabase.functions.invoke("ai-review-agent", {
      body: { request_id: input.draftId, shadow: false },
    });
  } catch (e) {
    console.warn("[submit] ai-review-agent invoke failed (silent):", e);
  }

  return { ok: true, requestNumber: updated[0].request_number, normalizedName };
}

/** 본인 DRAFT 5건 fetch (이어쓰기용 카드) */
export type DraftRow = {
  id: string;
  request_number: string;
  item_name: string;
  updated_at: string;
};
export async function fetchMyDrafts(userId: string): Promise<DraftRow[]> {
  const data = await rest<DraftRow[]>("GET", "item_requests", {
    params: {
      select: "id,request_number,item_name,updated_at",
      requester_id: `eq.${userId}`,
      status: "eq.DRAFT",
      order: "updated_at.desc",
      limit: "5",
    },
  });
  return data ?? [];
}

/** 기존 items에서 제조사 모델 distinct 추출 — 모델명 자동완성용 (rest) */
export async function fetchModelsByMaker(makerName: string): Promise<string[]> {
  if (!makerName.trim()) return [];
  try {
    const data = await rest<Array<{ model: string | null }>>("GET", "items", {
      params: {
        select: "model",
        maker: `eq.${makerName}`,
        is_active: "eq.true",
        model: "not.is.null",
        limit: "500",
      },
    });
    const set = new Set<string>();
    data.forEach((r) => r.model && set.add(r.model));
    return [...set].sort();
  } catch {
    return [];
  }
}
