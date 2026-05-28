import { rest } from "./supabase";
import type { Database } from "../integrations/supabase/types";

export type RequestStatus = Database["public"]["Enums"]["request_status"];

export type RequestRow = {
  id: string;
  request_number: string;
  item_name: string;
  normalized_name: string | null;
  item_code: string | null;
  maker: string | null;
  status: RequestStatus;
  created_at: string;
  requester_id: string | null;
  company_id: string | null;
  site_id: string | null;
  // joined display fields
  requesterName: string | null;
  companyCode: string | null;
  companyName: string | null;
  siteCode: string | null;
  siteName: string | null;
};

export type StatusFilter = "all" | "needs_action" | "pending" | "approved" | "rejected";
export type TabKey = "my" | "all";

export type RequestsStats = {
  all: number;
  needs_action: number;
  pending: number;
  approved: number;
  rejected: number;
};

const SELECT_COLS = `
  id, request_number, item_name, normalized_name, item_code, maker,
  status, created_at, requester_id, company_id, site_id
`;

/**
 * 요청목록 fetch. 탭에 따라 본인/전체 분리.
 *  - "my": 본인 신청건만 (requester_id 필터)
 *  - "all": Supabase RLS가 권한별 범위 자동 적용 (admin=전체 / reviewer=본인 회사 + 본인 신청)
 */
export async function fetchRequests(opts: {
  tab: TabKey;
  userId: string;
}): Promise<RequestRow[]> {
  const { tab, userId } = opts;

  // supabase-js PostgrestBuilder hang 회피 — native fetch (rest 헬퍼)
  const params: Record<string, string> = {
    select: SELECT_COLS.replace(/\s+/g, ""),
    order: "created_at.desc",
  };
  if (tab === "my") params.requester_id = `eq.${userId}`;

  const data = await rest<Array<{
    company_id: string | null;
    site_id: string | null;
    requester_id: string | null;
    [key: string]: unknown;
  }>>("GET", "item_requests", { params });

  if (!data || data.length === 0) return [];

  // 관련 ID 수집
  const companyIds = [...new Set(data.map((r) => r.company_id).filter((x): x is string => !!x))];
  const siteIds = [...new Set(data.map((r) => r.site_id).filter((x): x is string => !!x))];
  const requesterIds = [...new Set(data.map((r) => r.requester_id).filter((x): x is string => !!x))];

  const inList = (ids: string[]) => `in.(${ids.join(",")})`;
  const [companiesRes, sitesRes, profilesRes] = await Promise.all([
    companyIds.length > 0
      ? rest<Array<{ id: string; code: string; name: string }>>("GET", "companies", { params: { select: "id,code,name", id: inList(companyIds) } })
      : Promise.resolve([] as Array<{ id: string; code: string; name: string }>),
    siteIds.length > 0
      ? rest<Array<{ id: string; code: string; name: string }>>("GET", "sites", { params: { select: "id,code,name", id: inList(siteIds) } })
      : Promise.resolve([] as Array<{ id: string; code: string; name: string }>),
    requesterIds.length > 0
      ? rest<Array<{ user_id: string; display_name: string }>>("GET", "profiles", { params: { select: "user_id,display_name", user_id: inList(requesterIds) } })
      : Promise.resolve([] as Array<{ user_id: string; display_name: string }>),
  ]);

  const companyMap = new Map(companiesRes.map((c) => [c.id, c]));
  const siteMap = new Map(sitesRes.map((s) => [s.id, s]));
  const profileMap = new Map(profilesRes.map((p) => [p.user_id, p]));

  return data.map((r) => {
    const c = r.company_id ? companyMap.get(r.company_id) : null;
    const s = r.site_id ? siteMap.get(r.site_id) : null;
    const p = r.requester_id ? profileMap.get(r.requester_id) : null;
    return {
      ...r,
      requesterName: p?.display_name ?? null,
      companyCode: c?.code ?? null,
      companyName: c?.name ?? null,
      siteCode: s?.code ?? null,
      siteName: s?.name ?? null,
    } as RequestRow;
  });
}

/** Stats 5 카드 — 전체/보완요청/검토대기/승인/반려 */
export function computeStats(rows: RequestRow[]): RequestsStats {
  let needs_action = 0,
    pending = 0,
    approved = 0,
    rejected = 0;
  for (const r of rows) {
    if (r.status === "AI_ESCALATED_TO_REQUESTER") needs_action++;
    else if (r.status.startsWith("PENDING")) pending++;
    else if (r.status === "APPROVED") approved++;
    else if (r.status === "REJECTED" || r.status === "REVOKED") rejected++;
  }
  return { all: rows.length, needs_action, pending, approved, rejected };
}

/** 상태 필터 + 검색어 필터 */
export function filterRows(
  rows: RequestRow[],
  statusFilter: StatusFilter,
  search: string,
): RequestRow[] {
  let result = rows;
  if (statusFilter === "pending") result = result.filter((r) => r.status.startsWith("PENDING"));
  else if (statusFilter === "needs_action") result = result.filter((r) => r.status === "AI_ESCALATED_TO_REQUESTER");
  else if (statusFilter === "approved") result = result.filter((r) => r.status === "APPROVED");
  else if (statusFilter === "rejected") result = result.filter((r) => r.status === "REJECTED" || r.status === "REVOKED");

  const term = search.trim().toLowerCase();
  if (term) {
    result = result.filter(
      (r) =>
        r.request_number.toLowerCase().includes(term) ||
        r.item_name.toLowerCase().includes(term) ||
        (r.normalized_name ?? "").toLowerCase().includes(term) ||
        (r.requesterName ?? "").toLowerCase().includes(term) ||
        (r.companyName ?? "").toLowerCase().includes(term) ||
        (r.companyCode ?? "").toLowerCase().includes(term) ||
        (r.siteName ?? "").toLowerCase().includes(term) ||
        (r.maker ?? "").toLowerCase().includes(term),
    );
  }
  return result;
}

export const STATUS_LABEL: Record<RequestStatus, { cls: string; label: string }> = {
  DRAFT: { cls: "draft", label: "임시저장" },
  PENDING_AI_REVIEW: { cls: "ai", label: "AI 검토 중" },
  AI_PROCESSING: { cls: "ai", label: "AI 분석" },
  AI_ESCALATED: { cls: "ai", label: "AI 위임" },
  MANUAL_REVIEW_AFTER_AI: { cls: "review", label: "수동 1차" },
  AI_ESCALATED_TO_REQUESTER: { cls: "needs", label: "보완 요청" },
  PENDING_REVIEW_1: { cls: "review", label: "1차 검토" },
  PENDING_REVIEW_2: { cls: "review", label: "2차 검토" },
  PENDING_REVIEW_3: { cls: "review", label: "3차 검토" },
  APPROVED: { cls: "approve", label: "승인 완료" },
  REJECTED: { cls: "reject", label: "반려" },
  REVOKED: { cls: "reject", label: "취소" },
};
