import { rest } from "./supabase";
import type { Database } from "../integrations/supabase/types";

export type ItemRequestRow = Database["public"]["Tables"]["item_requests"]["Row"];
export type RequestStatus = Database["public"]["Enums"]["request_status"];

export type ApprovalBundle = {
  request: ItemRequestRow;
  requesterName: string | null;
  requesterDepartment: string | null;
  companyCode: string | null;
  companyName: string | null;
  siteCode: string | null;
  siteName: string | null;
  businessUnitName: string | null;
  reviewer1Name: string | null;
  reviewer2Name: string | null;
  reviewer3Name: string | null;
  /** item_request_id에 매핑된 사용처(조직/설비) */
  organizations: OrganizationRow[];
};

export type OrganizationRow = {
  id: string;
  companyName: string | null;
  siteName: string | null;
  equipmentName: string | null;
};

/** 검토승인 상세 — 단건 fetch + 모든 관련 데이터 조인 (rest 헬퍼) */
export async function fetchApprovalBundle(id: string): Promise<ApprovalBundle> {
  const reqArr = await rest<ItemRequestRow[]>("GET", "item_requests", {
    params: { id: `eq.${id}`, select: "*", limit: "1" },
  });
  if (!reqArr || reqArr.length === 0) throw new Error("Request not found");
  const req = reqArr[0];

  const first = <T,>(arr: T[]): T | null => (arr && arr.length > 0 ? arr[0] : null);
  const fetchOne = async <T,>(table: string, params: Record<string, string>): Promise<T | null> => {
    const arr = await rest<T[]>("GET", table, { params: { ...params, limit: "1" } });
    return first(arr);
  };

  const [companyRow, siteRow, requesterProf, rev1Prof, rev2Prof, rev3Prof, orgs] = await Promise.all([
    req.company_id
      ? fetchOne<{ code: string; name: string }>("companies", { id: `eq.${req.company_id}`, select: "code,name" })
      : Promise.resolve(null),
    req.site_id
      ? fetchOne<{ code: string; name: string; business_unit_code: string | null }>("sites", { id: `eq.${req.site_id}`, select: "code,name,business_unit_code" })
      : Promise.resolve(null),
    req.requester_id
      ? fetchOne<{ display_name: string | null; department: string | null }>("profiles", { user_id: `eq.${req.requester_id}`, select: "display_name,department" })
      : Promise.resolve(null),
    req.reviewer_1_id
      ? fetchOne<{ display_name: string | null }>("profiles", { user_id: `eq.${req.reviewer_1_id}`, select: "display_name" })
      : Promise.resolve(null),
    req.reviewer_2_id
      ? fetchOne<{ display_name: string | null }>("profiles", { user_id: `eq.${req.reviewer_2_id}`, select: "display_name" })
      : Promise.resolve(null),
    req.reviewer_3_id
      ? fetchOne<{ display_name: string | null }>("profiles", { user_id: `eq.${req.reviewer_3_id}`, select: "display_name" })
      : Promise.resolve(null),
    rest<Array<{ id: string; company_id: string | null; site_id: string | null; equipment_name: string | null }>>(
      "GET",
      "item_organizations",
      { params: { item_request_id: `eq.${id}`, select: "id,company_id,site_id,equipment_name" } },
    ),
  ]);

  // business_unit_code → business_units 매핑
  let businessUnitName: string | null = null;
  if (siteRow?.business_unit_code && req.company_id) {
    const bu = await fetchOne<{ name: string }>("business_units", {
      company_id: `eq.${req.company_id}`,
      code: `eq.${siteRow.business_unit_code}`,
      select: "name",
    });
    businessUnitName = bu?.name ?? null;
  }

  // organizations 이름 lookup
  let organizations: OrganizationRow[] = [];
  if (orgs.length > 0) {
    const cIds = [...new Set(orgs.map((o) => o.company_id).filter((x): x is string => !!x))];
    const sIds = [...new Set(orgs.map((o) => o.site_id).filter((x): x is string => !!x))];
    const inList = (ids: string[]) => `in.(${ids.join(",")})`;
    const [cArr, sArr] = await Promise.all([
      cIds.length > 0
        ? rest<Array<{ id: string; name: string }>>("GET", "companies", { params: { id: inList(cIds), select: "id,name" } })
        : Promise.resolve([] as Array<{ id: string; name: string }>),
      sIds.length > 0
        ? rest<Array<{ id: string; name: string }>>("GET", "sites", { params: { id: inList(sIds), select: "id,name" } })
        : Promise.resolve([] as Array<{ id: string; name: string }>),
    ]);
    const cMap = new Map(cArr.map((c) => [c.id, c.name]));
    const sMap = new Map(sArr.map((s) => [s.id, s.name]));
    organizations = orgs.map((o) => ({
      id: o.id,
      companyName: o.company_id ? cMap.get(o.company_id) ?? null : null,
      siteName: o.site_id ? sMap.get(o.site_id) ?? null : null,
      equipmentName: o.equipment_name,
    }));
  }

  return {
    request: req,
    requesterName: requesterProf?.display_name ?? null,
    requesterDepartment: requesterProf?.department ?? null,
    companyCode: companyRow?.code ?? null,
    companyName: companyRow?.name ?? null,
    siteCode: siteRow?.code ?? null,
    siteName: siteRow?.name ?? null,
    businessUnitName,
    reviewer1Name: rev1Prof?.display_name ?? null,
    reviewer2Name: rev2Prof?.display_name ?? null,
    reviewer3Name: rev3Prof?.display_name ?? null,
    organizations,
  };
}

/** 검토 단계 — 1차/2차/3차 진행 상태 도출 */
export function getStepStates(status: RequestStatus, r: ItemRequestRow): {
  step1: "done" | "current" | "pending";
  step2: "done" | "current" | "pending";
  step3: "done" | "current" | "pending";
} {
  // step 1: AI 또는 수동 1차
  const step1Done = !!r.review_1_at || ["PENDING_REVIEW_2", "PENDING_REVIEW_3", "APPROVED"].includes(status);
  const step1Current = ["PENDING_AI_REVIEW", "AI_PROCESSING", "AI_ESCALATED", "MANUAL_REVIEW_AFTER_AI", "AI_ESCALATED_TO_REQUESTER", "PENDING_REVIEW_1"].includes(status);
  // step 2
  const step2Done = !!r.review_2_at || ["PENDING_REVIEW_3", "APPROVED"].includes(status);
  const step2Current = status === "PENDING_REVIEW_2";
  // step 3
  const step3Done = !!r.review_3_at || status === "APPROVED";
  const step3Current = status === "PENDING_REVIEW_3";

  return {
    step1: step1Done ? "done" : step1Current ? "current" : "pending",
    step2: step2Done ? "done" : step2Current ? "current" : "pending",
    step3: step3Done ? "done" : step3Current ? "current" : "pending",
  };
}
