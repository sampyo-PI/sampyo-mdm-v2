import { rest, restCount, rpc } from "./supabase";
import type { CatalogCategoryOptions, CatalogFilters } from "./catalogQueries";

// cat2_* 는 자동생성 Database 타입에 없어 rest()(문자열 테이블)로 접근.
export type Cat2Row = {
  id: string;
  legacy_code: string | null;
  new_item_code: string | null;
  item_name: string | null;
  large_category: string | null;
  medium_category: string | null;
  small_category: string | null;
  manufacturer: string | null;
  model: string | null;
  sub_type: string | null;
  application_equipment: string | null;
  spec: string | null;
  needs_review: boolean | null;
};

export type Cat2CatalogPage = { rows: Cat2Row[]; total: number };

const CAT2_SELECT =
  "id,legacy_code,new_item_code,item_name,large_category,medium_category,small_category,manufacturer,model,sub_type,application_equipment,spec,needs_review";

/** AG-Grid Infinite datasource.getRows → cat2_items limit/offset + restCount(total) */
export async function fetchCat2CatalogPage(
  filters: CatalogFilters,
  startRow: number,
  endRow: number,
  sortColumn = "legacy_code",
  sortAsc = true,
): Promise<Cat2CatalogPage> {
  const filterParams: Record<string, string> = {};
  if (filters.large) filterParams.large_category = `eq.${filters.large}`;
  if (filters.medium) filterParams.medium_category = `eq.${filters.medium}`;
  if (filters.small) filterParams.small_category = `eq.${filters.small}`;
  const term = filters.search.trim().replace(/[(),*]/g, "");
  if (term) {
    filterParams.or = `(item_name.ilike.*${term}*,legacy_code.ilike.*${term}*,model.ilike.*${term}*,manufacturer.ilike.*${term}*,sub_type.ilike.*${term}*)`;
  }

  const params: Record<string, string> = {
    ...filterParams,
    select: CAT2_SELECT,
    order: `${sortColumn}.${sortAsc ? "asc" : "desc"}`,
    limit: String(endRow - startRow),
    offset: String(startRow),
  };

  const [rows, total] = await Promise.all([
    rest<Cat2Row[]>("GET", "cat2_items", { params }),
    restCount("cat2_items", filterParams),
  ]);
  return { rows, total };
}

// ── Phase 5b: 스키마 기반 등록폼 + 중복엔진 ──
export type Cat2SchemaAttr = {
  position: number;
  name: string;
  display_name: string | null;
  fixed: boolean;
  required: boolean;
  type: string | null;
  unit: string | null;
  enum_values: string[] | null;
  master_values: string[] | null;
};

/** 소분류 목록 (등록폼 분류 선택용) */
export async function fetchCat2SmallCategories(): Promise<string[]> {
  const cats = await rest<{ small: string }[]>("GET", "cat2_categories", {
    params: { select: "small", order: "small.asc", limit: "5000" },
  });
  return [...new Set(cats.map((c) => c.small).filter(Boolean))].sort();
}

/** 소분류별 실제 저장 필드 (sub_type 값 + 속성명) — 중복엔진 매칭과 정합 */
export async function fetchCat2CategoryFields(category: string): Promise<{ sub_types: string[]; attr_names: string[]; item_count: number }> {
  return rpc<{ sub_types: string[]; attr_names: string[]; item_count: number }>("cat2_category_fields", { p_category: category });
}

/** 카테고리(소분류) 스키마 — 참고용(영문명·required·enum). 매칭엔 위 fields 사용 */
export async function fetchCat2Schema(category: string): Promise<Cat2SchemaAttr[]> {
  return rest<Cat2SchemaAttr[]>("GET", "cat2_category_attributes", {
    params: {
      category: `eq.${category}`,
      select: "position,name,display_name,fixed,required,type,unit,enum_values,master_values",
      order: "position.asc",
    },
  });
}

export type DedupResult = {
  decision: "duplicate" | "similar" | "new" | "review";
  llm_available?: boolean;
  normalized?: Record<string, string> | null;
  provided_keys?: number;
  exact_dim_matches?: number;
  candidates_considered?: number;
  matches?: { legacy_code: string; confidence: number; reason: string }[];
  candidates?: { legacy_code: string; item_name: string; sub_type: string | null; manufacturer: string | null; model: string | null; spec: string | null; matched_keys?: number; provided_keys?: number }[];
  note?: string;
  error?: string;
};

/** cat2-dedup-check Edge Function 호출 (정규화→후보→Gemini 판정) */
export async function cat2DedupCheck(payload: {
  category: string; itemName: string; spec?: string | null; maker?: string | null;
  model?: string | null; subType?: string | null; attributes?: Record<string, string>;
}): Promise<DedupResult> {
  const URL = import.meta.env.VITE_SUPABASE_URL as string;
  const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const r = await fetch(`${URL}/functions/v1/cat2-dedup-check`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await r.json()) as DedupResult;
}

/** 분류 필터 옵션 — cat2_categories(대/중/소 트리)에서 distinct 구성 */
export async function fetchCat2CategoryOptions(): Promise<CatalogCategoryOptions> {
  const cats = await rest<{ large: string; medium: string; small: string }[]>("GET", "cat2_categories", {
    params: { select: "large,medium,small", order: "large.asc", limit: "5000" },
  });
  const largeSet = new Set<string>();
  const medMap = new Map<string, { name: string; large_name: string }>();
  const smallMap = new Map<string, { name: string; medium_name: string | null }>();
  for (const c of cats) {
    if (c.large) largeSet.add(c.large);
    if (c.medium) medMap.set(c.large + "›" + c.medium, { name: c.medium, large_name: c.large });
    if (c.small) smallMap.set(c.medium + "›" + c.small, { name: c.small, medium_name: c.medium });
  }
  return {
    large: [...largeSet].sort(),
    medium: [...medMap.values()],
    small: [...smallMap.values()],
  };
}
