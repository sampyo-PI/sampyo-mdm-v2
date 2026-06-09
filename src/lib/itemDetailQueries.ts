import { supabase, rest, rpc } from "./supabase";
import type { ItemRow } from "./catalogQueries";

export type LinkedCompany = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  ic_is_active: boolean | null;
  source: string | null;
  added_at: string;
  stock_unit_code: string | null;
  item_account_code: string | null;
  item_class_code: string | null;
  site_id: string | null;
  site_name: string | null;
  equipment_name: string | null;
};

export type CompanyOption = { id: string; code: string; name: string };
export type AccountOption = { account_code: string; account_name: string };
export type ClassOption = { class_code: string; class_name: string };

/** 활성 법인 목록 (배포 대상 선택) */
export async function fetchActiveCompanies(): Promise<CompanyOption[]> {
  return rest<CompanyOption[]>("GET", "companies", {
    params: { select: "id,code,name", is_active: "eq.true", order: "sort_order.asc", limit: "100" },
  });
}

/** 법인별 품목계정 목록 */
export async function fetchCompanyAccounts(companyCode: string): Promise<AccountOption[]> {
  return rest<AccountOption[]>("GET", "erp_item_accounts", {
    params: { select: "account_code,account_name", company_code: `eq.${companyCode}`, order: "account_code.asc", limit: "1000" },
  });
}

/** 품목클래스 목록 (전역) */
export async function fetchItemClasses(): Promise<ClassOption[]> {
  return rest<ClassOption[]>("GET", "erp_item_classes", {
    params: { select: "class_code,class_name", order: "class_code.asc", limit: "500" },
  });
}

/** 법인 배포 (품목계정/클래스 선택 가능, 사업장/설비 미사용) */
export async function distributeToCompany(args: {
  itemCode: string;
  companyCode: string;
  accountCode?: string | null;
  classCode?: string | null;
}): Promise<{ success?: boolean; error?: string; erp_skipped?: boolean; reason?: string }> {
  return rpc("distribute_item_to_company", {
    p_item_code: args.itemCode,
    p_target_company_code: args.companyCode,
    p_item_account_code: args.accountCode ?? null,
    p_item_class_code: args.classCode ?? null,
  });
}

/** 배포 법인 활성/해제 (admin, soft + ERP REVOKE 큐) */
export async function setItemCompanyActive(itemId: string, companyId: string, active: boolean): Promise<{ success?: boolean; error?: string; no_change?: boolean }> {
  return rpc("set_item_company_active", { p_item_id: itemId, p_company_id: companyId, p_active: active });
}

export type AttributeSlot = {
  sort_order: number;
  name: string;
  value: string | null;
  include_in_name: boolean;
};

export type BatchInfo = {
  id: string;
  file_name: string | null;
  display_label: string | null;
  uploaded_at: string;
  note: string | null;
};

export type FieldTerm = { id: string; term: string; is_active: boolean };
export type ItemDetailBundle = {
  item: ItemRow;
  linkedCompanies: LinkedCompany[];
  attributeSlots: AttributeSlot[];
  batch: BatchInfo | null;
  smallCategoryId: string | null;        // 현장용어 추가용
  fieldTerms: FieldTerm[];               // 소분류 현장용어
  requestAttachments: { images: string[]; docs: string[] };  // 원 신청 첨부 (item_request_id)
};

/**
 * 상세 다이얼로그에서 한 번에 fetch.
 *  - item_companies × companies (사용 법인)
 *  - category_attribute_mappings (sort_order 1-5 슬롯, items.attributes와 매칭)
 *  - upload_batches (source=bulk_upload인 경우)
 */
export async function fetchItemDetail(item: ItemRow): Promise<ItemDetailBundle> {
  // 사용법인
  const linked: LinkedCompany[] = [];
  if (item.id) {
    // types.ts(자동생성)가 신규 컬럼(site_id 등) 미반영 → rest() 문자열 쿼리로 우회
    type ICRow = {
      is_active: boolean | null; source: string | null; added_at: string;
      stock_unit_code: string | null; item_account_code: string | null; item_class_code: string | null;
      site_id: string | null; equipment_name: string | null;
      company: { id: string; code: string; name: string; is_active: boolean } | null;
      site: { name: string } | null;
    };
    const data = await rest<ICRow[]>("GET", "item_companies", {
      params: {
        select:
          "is_active,source,added_at,stock_unit_code,item_account_code,item_class_code,site_id,equipment_name,company:companies(id,code,name,is_active),site:sites(name)",
        item_id: `eq.${item.id}`,
      },
    });
    for (const r of data ?? []) {
      const c = r.company;
      if (!c) continue;
      linked.push({
        id: c.id,
        code: c.code,
        name: c.name,
        is_active: c.is_active,
        ic_is_active: r.is_active,
        source: r.source,
        added_at: r.added_at,
        stock_unit_code: r.stock_unit_code,
        item_account_code: r.item_account_code,
        item_class_code: r.item_class_code,
        site_id: r.site_id ?? null,
        site_name: r.site?.name ?? null,
        equipment_name: r.equipment_name ?? null,
      });
    }
    linked.sort((a, b) => a.code.localeCompare(b.code));
  }

  // 5 속성 슬롯 (소분류 기준) + 현장용어
  const attributeSlots: AttributeSlot[] = [];
  let smallCategoryId: string | null = null;
  let fieldTerms: FieldTerm[] = [];
  if (item.small_category) {
    const { data: smallRow } = await supabase
      .from("category_small")
      .select("id")
      .eq("name", item.small_category)
      .maybeSingle();
    if (smallRow?.id) {
      smallCategoryId = smallRow.id;
      // 현장용어 (소분류)
      try {
        fieldTerms = await rest<FieldTerm[]>("GET", "category_field_terms", {
          params: { select: "id,term,is_active", small_category_id: `eq.${smallRow.id}`, order: "sort_order.asc" },
        });
      } catch { fieldTerms = []; }
      const { data: maps } = await supabase
        .from("category_attribute_mappings")
        .select(`sort_order, include_in_name, attribute:attributes(name)`)
        .eq("small_category_id", smallRow.id)
        .order("sort_order", { ascending: true })
        .limit(5);
      const attrValueByName = new Map<string, string>();
      const raw = item.attributes as unknown;
      if (Array.isArray(raw)) {
        for (const a of raw as Array<{ name?: string; value?: string }>) {
          if (a?.name) attrValueByName.set(String(a.name).trim(), String(a.value ?? ""));
        }
      } else if (raw && typeof raw === "object") {
        for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
          attrValueByName.set(k.trim(), String(v ?? ""));
        }
      }
      for (const m of maps ?? []) {
        const attrName = (m.attribute as unknown as { name: string } | null)?.name ?? "";
        attributeSlots.push({
          sort_order: m.sort_order ?? 99,
          name: attrName,
          value: attrValueByName.get(attrName.trim()) ?? null,
          include_in_name: !!m.include_in_name,
        });
      }
    }
  }

  // upload_batch
  let batch: BatchInfo | null = null;
  if (item.upload_batch_id) {
    const { data } = await supabase
      .from("upload_batches")
      .select("id, file_name, display_label, uploaded_at, note")
      .eq("id", item.upload_batch_id)
      .maybeSingle();
    if (data) batch = data as BatchInfo;
  }

  // 첨부파일 — 원 신청(item_request_id)의 image_urls/document_urls
  let requestAttachments = { images: [] as string[], docs: [] as string[] };
  const reqId = (item as unknown as { item_request_id?: string | null }).item_request_id;
  if (reqId) {
    try {
      const reqs = await rest<Array<{ image_urls: string[] | null; document_urls: string[] | null }>>(
        "GET", "item_requests",
        { params: { select: "image_urls,document_urls", id: `eq.${reqId}`, limit: "1" } },
      );
      if (reqs[0]) requestAttachments = { images: reqs[0].image_urls ?? [], docs: reqs[0].document_urls ?? [] };
    } catch { /* 무시 */ }
  }

  return { item, linkedCompanies: linked, attributeSlots, batch, smallCategoryId, fieldTerms, requestAttachments };
}
