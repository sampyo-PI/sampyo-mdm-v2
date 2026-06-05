import { useMemo } from "react";
import type { CatalogFilters as F, CatalogCategoryOptions } from "../../lib/catalogQueries";
import { SearchCombobox } from "../common/SearchCombobox";

type Props = {
  filters: F;
  setFilters: (next: F) => void;
  options: CatalogCategoryOptions | undefined;
  isOptionsLoading: boolean;
  totalCount: number;
  onSearch: () => void;
  extra?: React.ReactNode;
};

const SOURCE_LABELS: Record<NonNullable<F["source"]>, string> = {
  mdm: "신규 (MDM)",
  legacy: "기존 (legacy)",
  bulk_upload: "일괄 업로드",
};
const SOURCE_OPTIONS = ["신규 (MDM)", "기존 (legacy)", "일괄 업로드"];

function labelToSource(label: string | null): F["source"] {
  if (!label) return null;
  for (const [k, v] of Object.entries(SOURCE_LABELS)) {
    if (v === label) return k as F["source"];
  }
  return null;
}

export function CatalogFilters({ filters, setFilters, options, isOptionsLoading, totalCount, onSearch, extra }: Props) {
  const mediumOptions = useMemo(() => {
    if (!options) return [] as string[];
    if (!filters.large) return options.medium.map((m) => m.name);
    return options.medium.filter((m) => m.large_name === filters.large).map((m) => m.name);
  }, [options, filters.large]);

  const smallOptions = useMemo(() => {
    if (!options) return [] as string[];
    if (!filters.medium) return options.small.map((s) => s.name);
    return options.small.filter((s) => s.medium_name === filters.medium).map((s) => s.name);
  }, [options, filters.medium]);

  const activeCount = [filters.large, filters.medium, filters.small, filters.source, filters.search.trim() || null]
    .filter(Boolean).length;

  const sourceValue = filters.source ? SOURCE_LABELS[filters.source] : null;

  return (
    <div className="filter-card">
      <div style={{ width: 140 }}>
        <label>대분류</label>
        <SearchCombobox
          value={filters.large ?? null}
          onChange={(v) => setFilters({ ...filters, large: v, medium: null, small: null })}
          options={options?.large ?? []}
          disabled={isOptionsLoading}
        />
      </div>
      <div style={{ width: 140 }}>
        <label>중분류</label>
        <SearchCombobox
          value={filters.medium ?? null}
          onChange={(v) => setFilters({ ...filters, medium: v, small: null })}
          options={mediumOptions}
          disabled={isOptionsLoading}
        />
      </div>
      <div style={{ width: 140 }}>
        <label>소분류</label>
        <SearchCombobox
          value={filters.small ?? null}
          onChange={(v) => setFilters({ ...filters, small: v })}
          options={smallOptions}
          disabled={isOptionsLoading}
        />
      </div>
      <div style={{ width: 140 }}>
        <label>구분</label>
        <SearchCombobox
          value={sourceValue}
          onChange={(label) => setFilters({ ...filters, source: labelToSource(label) })}
          options={SOURCE_OPTIONS}
        />
      </div>
      <div className="flex-1" style={{ minWidth: 220 }}>
        <label>검색어</label>
        <input
          type="text"
          placeholder="품목명 / 코드 / legacy / 모델"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch();
          }}
          style={{ width: "100%" }}
        />
      </div>
      <span className="chip">활성 필터 {activeCount}</span>
      <span className="chip">{totalCount.toLocaleString("ko-KR")} 건</span>
      <button
        type="button"
        className="btn-sec"
        onClick={() =>
          setFilters({ search: "", large: null, medium: null, small: null, source: null })
        }
      >
        초기화
      </button>
      <button type="button" className="btn-pri" onClick={onSearch}>
        조회
      </button>
      {extra && <div style={{ marginLeft: "auto" }}>{extra}</div>}
    </div>
  );
}
