import { rest, rpc } from "./supabase";

export type DistRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type DistRequest = {
  id: string;
  item_id: string;
  item_code: string;
  company_id: string;
  company_code: string;
  requested_by: string | null;
  requester_note: string | null;
  status: DistRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  // embeds
  item?: { item_name: string | null; normalized_name: string | null; small_category: string | null } | null;
  company?: { name: string | null } | null;
  // 별도 조회로 채움
  requesterName?: string;
  requesterDept?: string;
};

/** 배포 요청 생성 (본인 법인 자동) */
export async function requestDistribution(itemCode: string, note?: string | null) {
  return rpc<{ success?: boolean; error?: string; company_code?: string }>("request_item_distribution", {
    p_item_code: itemCode,
    p_note: note ?? null,
  });
}

/** 특정 품목·법인의 내 PENDING 요청 존재 여부 (카탈로그 상세 버튼 상태용) */
export async function fetchMyPendingRequest(itemId: string, companyId: string): Promise<DistRequest | null> {
  const rows = await rest<DistRequest[]>("GET", "item_distribution_requests", {
    params: {
      select: "id,status,created_at",
      item_id: `eq.${itemId}`,
      company_id: `eq.${companyId}`,
      status: "eq.PENDING",
      limit: "1",
    },
  });
  return rows[0] ?? null;
}

/** 배포 요청 목록 (관리 페이지) — requester 이름은 profiles 별도 조회로 채움 */
export async function fetchDistributionRequests(status: DistRequestStatus | "all"): Promise<DistRequest[]> {
  const params: Record<string, string> = {
    select:
      "id,item_id,item_code,company_id,company_code,requested_by,requester_note,status,reviewed_by,reviewed_at,review_note,created_at," +
      "item:items(item_name,normalized_name,small_category),company:companies(name)",
    order: "created_at.desc",
    limit: "500",
  };
  if (status !== "all") params.status = `eq.${status}`;
  const rows = await rest<DistRequest[]>("GET", "item_distribution_requests", { params });

  const uids = Array.from(new Set(rows.map((r) => r.requested_by).filter(Boolean))) as string[];
  if (uids.length) {
    const profs = await rest<Array<{ user_id: string; display_name: string | null; department: string | null }>>(
      "GET",
      "profiles",
      { params: { select: "user_id,display_name,department", user_id: `in.(${uids.join(",")})` } },
    );
    const m = new Map(profs.map((p) => [p.user_id, p]));
    for (const r of rows) {
      const p = r.requested_by ? m.get(r.requested_by) : undefined;
      r.requesterName = p?.display_name ?? "(알 수 없음)";
      r.requesterDept = p?.department ?? "";
    }
  }
  return rows;
}

export async function approveDistribution(id: string, accountCode?: string | null, classCode?: string | null) {
  return rpc<{ success?: boolean; error?: string }>("approve_item_distribution", {
    p_request_id: id,
    p_item_account_code: accountCode ?? null,
    p_item_class_code: classCode ?? null,
  });
}

export async function rejectDistribution(id: string, note?: string | null) {
  return rpc<{ success?: boolean; error?: string }>("reject_item_distribution", {
    p_request_id: id,
    p_note: note ?? null,
  });
}
