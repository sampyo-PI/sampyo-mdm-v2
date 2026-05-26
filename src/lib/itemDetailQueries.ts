import { supabase } from "./supabase";
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
};

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

export type ItemDetailBundle = {
  item: ItemRow;
  linkedCompanies: LinkedCompany[];
  attributeSlots: AttributeSlot[];
  batch: BatchInfo | null;
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
    const { data } = await supabase
      .from("item_companies")
      .select(`is_active, source, added_at, stock_unit_code, item_account_code, item_class_code,
               company:companies(id, code, name, is_active)`)
      .eq("item_id", item.id);
    for (const r of data ?? []) {
      const c = r.company as unknown as { id: string; code: string; name: string; is_active: boolean } | null;
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
      });
    }
    linked.sort((a, b) => a.code.localeCompare(b.code));
  }

  // 5 속성 슬롯 (소분류 기준)
  const attributeSlots: AttributeSlot[] = [];
  if (item.small_category) {
    const { data: smallRow } = await supabase
      .from("category_small")
      .select("id")
      .eq("name", item.small_category)
      .maybeSingle();
    if (smallRow?.id) {
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

  return { item, linkedCompanies: linked, attributeSlots, batch };
}
