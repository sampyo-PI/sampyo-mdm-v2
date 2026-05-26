import { supabase } from "./supabase";
import type { Database } from "../integrations/supabase/types";

export type ItemRow = Database["public"]["Tables"]["items"]["Row"];
export type RequestStatus = Database["public"]["Enums"]["request_status"];

export type CatalogFilters = {
  search: string;
  large?: string | null;
  medium?: string | null;
  small?: string | null;
  source?: "mdm" | "legacy" | "bulk_upload" | null;
};

export type CatalogPage = {
  rows: ItemRow[];
  total: number;
};

/**
 * AG-Grid Infinite Row Model의 datasource.getRows에서 호출.
 * Supabase .range(start, end-1) inclusive. count: "exact"로 총 건수 회수.
 */
export async function fetchCatalogPage(
  filters: CatalogFilters,
  startRow: number,
  endRow: number,
  sortColumn: string = "item_code",
  sortAsc: boolean = true,
): Promise<CatalogPage> {
  let q = supabase
    .from("items")
    .select(
      `id, item_code, item_code_display, item_name, normalized_name,
       large_category, medium_category, small_category,
       maker, model, equipment, stock_unit_code,
       attributes, is_active, source, legacy_code,
       created_at, updated_at`,
      { count: "exact" },
    )
    .eq("is_active", true);

  if (filters.search.trim()) {
    const term = filters.search.trim();
    const escaped = term.replace(/[%_]/g, (m) => `\\${m}`);
    // OR across item_name / item_code / item_code_display / legacy_code / model
    q = q.or(
      `item_name.ilike.%${escaped}%,item_code.ilike.%${escaped}%,item_code_display.ilike.%${escaped}%,legacy_code.ilike.%${escaped}%,model.ilike.%${escaped}%`,
    );
  }
  if (filters.large) q = q.eq("large_category", filters.large);
  if (filters.medium) q = q.eq("medium_category", filters.medium);
  if (filters.small) q = q.eq("small_category", filters.small);
  if (filters.source) q = q.eq("source", filters.source);

  q = q.order(sortColumn, { ascending: sortAsc }).range(startRow, endRow - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: (data ?? []) as ItemRow[], total: count ?? 0 };
}

export type CatalogCategoryOptions = {
  large: string[];
  medium: { name: string; large_name: string }[];
  small: { name: string; medium_name: string | null }[];
};

/**
 * 분류 필터 옵션. category_* 마스터에서 조회 (652 소분류 / 138 중 / 16 대).
 * page 한 번만 호출 → react-query 캐시.
 */
export async function fetchCategoryOptions(): Promise<CatalogCategoryOptions> {
  const [largeRes, medRes, smallRes] = await Promise.all([
    supabase.from("category_large").select("name").order("name"),
    supabase
      .from("category_medium")
      .select("name, category_large(name)")
      .order("name"),
    supabase
      .from("category_small")
      .select("name, category_medium(name)")
      .order("name"),
  ]);
  if (largeRes.error) throw largeRes.error;
  if (medRes.error) throw medRes.error;
  if (smallRes.error) throw smallRes.error;

  return {
    large: (largeRes.data ?? []).map((r) => r.name),
    medium: (medRes.data ?? []).map((r) => ({
      name: r.name,
      large_name: (r.category_large as unknown as { name: string } | null)?.name ?? "",
    })),
    small: (smallRes.data ?? []).map((r) => ({
      name: r.name,
      medium_name: (r.category_medium as unknown as { name: string } | null)?.name ?? null,
    })),
  };
}
