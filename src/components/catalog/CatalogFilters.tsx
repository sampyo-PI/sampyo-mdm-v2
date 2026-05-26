import { useMemo } from "react";
import type { CatalogFilters as F, CatalogCategoryOptions } from "../../lib/catalogQueries";

type Props = {
  filters: F;
  setFilters: (next: F) => void;
  options: CatalogCategoryOptions | undefined;
  isOptionsLoading: boolean;
  totalCount: number;
  onSearch: () => void;
};

const SOURCE_OPTIONS = [
  { value: "", label: "전체" },
  { value: "mdm", label: "신규 (MDM)" },
  { value: "legacy", label: "기존 (legacy)" },
  { value: "bulk_upload", label: "일괄 업로드" },
] as const;

export function CatalogFilters({ filters, setFilters, options, isOptionsLoading, totalCount, onSearch }: Props) {
  // 캐스케이딩: 대 선택 시 중분류 = 해당 대 소속만, 중 선택 시 소분류 = 해당 중 소속만
  const mediumOptions = useMemo(() => {
    if (!options) return [];
    if (!filters.large) return options.medium;
    return options.medium.filter((m) => m.large_name === filters.large);
  }, [options, filters.large]);

  const smallOptions = useMemo(() => {
    if (!options) return [];
    if (!filters.medium) return options.small;
    return options.small.filter((s) => s.medium_name === filters.medium);
  }, [options, filters.medium]);

  const activeCount = [filters.large, filters.medium, filters.small, filters.source, filters.search.trim() || null]
    .filter(Boolean).length;

  return (
    <div className="filter-card">
      <div>
        <label>대분류</label>
        <select
          value={filters.large ?? ""}
          onChange={(e) =>
            setFilters({ ...filters, large: e.target.value || null, medium: null, small: null })
          }
          disabled={isOptionsLoading}
        >
          <option value="">전체</option>
          {options?.large.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>
      <div>
        <label>중분류</label>
        <select
          value={filters.medium ?? ""}
          onChange={(e) => setFilters({ ...filters, medium: e.target.value || null, small: null })}
          disabled={isOptionsLoading}
        >
          <option value="">전체</option>
          {mediumOptions.map((m) => (
            <option key={`${m.large_name}-${m.name}`} value={m.name}>{m.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label>소분류</label>
        <select
          value={filters.small ?? ""}
          onChange={(e) => setFilters({ ...filters, small: e.target.value || null })}
          disabled={isOptionsLoading}
        >
          <option value="">전체</option>
          {smallOptions.map((s) => (
            <option key={`${s.medium_name}-${s.name}`} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label>구분</label>
        <select
          value={filters.source ?? ""}
          onChange={(e) =>
            setFilters({ ...filters, source: (e.target.value || null) as F["source"] })
          }
        >
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-[200px]">
        <label>검색어</label>
        <input
          type="text"
          placeholder="품목명 / 코드 / legacy / 모델"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch();
          }}
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
      <button type="button" className="btn-pri" style={{ marginLeft: "auto" }} onClick={onSearch}>
        조회
      </button>
    </div>
  );
}
