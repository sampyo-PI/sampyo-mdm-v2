import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  type GridApi,
  type GridReadyEvent,
  type IDatasource,
  type IGetRowsParams,
} from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { CatalogFilters } from "../components/catalog/CatalogFilters";
import {
  fetchCatalogPage,
  fetchCategoryOptions,
  type CatalogFilters as F,
  type ItemRow,
} from "../lib/catalogQueries";

ModuleRegistry.registerModules([AllCommunityModule]);

const SOURCE_BADGE: Record<string, string> = {
  mdm: "b-blue",
  legacy: "b-draft",
  bulk_upload: "b-warn",
};

const SOURCE_LABEL: Record<string, string> = {
  mdm: "신규",
  legacy: "기존",
  bulk_upload: "업로드",
};

const DEFAULT_FILTERS: F = { search: "", large: null, medium: null, small: null, source: null };

export function CatalogPage() {
  const [filters, setFilters] = useState<F>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<F>(DEFAULT_FILTERS);
  const [totalCount, setTotalCount] = useState(0);
  const gridApiRef = useRef<GridApi | null>(null);

  const categoryOptions = useQuery({
    queryKey: ["catalog-category-options"],
    queryFn: fetchCategoryOptions,
    staleTime: 5 * 60_000,
  });

  // 필터 변경 시 grid datasource 재설정 (서버 재호출)
  useEffect(() => {
    if (!gridApiRef.current) return;
    gridApiRef.current.setGridOption("datasource", makeDatasource(appliedFilters));
  }, [appliedFilters]);

  const makeDatasource = useCallback((f: F): IDatasource => {
    return {
      getRows: async (params: IGetRowsParams) => {
        try {
          const sort = params.sortModel[0];
          const { rows, total } = await fetchCatalogPage(
            f,
            params.startRow,
            params.endRow,
            sort?.colId ?? "item_code",
            sort ? sort.sort === "asc" : true,
          );
          setTotalCount(total);
          // endRow가 total보다 작으면 lastRow=undefined, 같거나 크면 lastRow=total
          const lastRow = params.endRow >= total ? total : undefined;
          params.successCallback(rows, lastRow);
        } catch (e) {
          console.error("[catalog] fetch error", e);
          params.failCallback();
        }
      },
    };
  }, []);

  const columnDefs = useMemo(
    () => [
      {
        field: "item_code_display" as keyof ItemRow,
        headerName: "표준코드",
        width: 160,
        pinned: "left" as const,
        cellClass: "cell-link",
      },
      { field: "item_name" as keyof ItemRow, headerName: "품목명", flex: 1, minWidth: 240 },
      { field: "normalized_name" as keyof ItemRow, headerName: "표준명", flex: 1, minWidth: 240 },
      { field: "small_category" as keyof ItemRow, headerName: "소분류", width: 120 },
      { field: "maker" as keyof ItemRow, headerName: "제조사", width: 120 },
      { field: "model" as keyof ItemRow, headerName: "모델", width: 140 },
      {
        field: "source" as keyof ItemRow,
        headerName: "구분",
        width: 90,
        cellRenderer: (p: { value: string | null }) =>
          p.value ? (
            <span className={`badge ${SOURCE_BADGE[p.value] ?? "b-draft"}`}>
              {SOURCE_LABEL[p.value] ?? p.value}
            </span>
          ) : null,
      },
      { field: "legacy_code" as keyof ItemRow, headerName: "기존코드", width: 130, cellClass: "num" },
    ],
    [],
  );

  const onGridReady = useCallback(
    (e: GridReadyEvent) => {
      gridApiRef.current = e.api;
      e.api.setGridOption("datasource", makeDatasource(appliedFilters));
    },
    [appliedFilters, makeDatasource],
  );

  return (
    <section className="page-card">
      <div className="page-h">
        <div>
          <h1>
            품목 카탈로그
            <span className="text-xs text-gray-500 font-normal ml-2">/ catalog</span>
          </h1>
          <div className="meta">활성 items 전수 조회 (AG-Grid Infinite + Supabase range)</div>
        </div>
        <div className="actions">
          <button className="btn-sec" type="button" disabled title="다음 단계">엑셀 다운로드</button>
        </div>
      </div>

      <CatalogFilters
        filters={filters}
        setFilters={setFilters}
        options={categoryOptions.data}
        isOptionsLoading={categoryOptions.isLoading}
        totalCount={totalCount}
        onSearch={() => setAppliedFilters(filters)}
      />

      <div className="section-title">품목 목록</div>
      <div className="ag-theme-quartz" style={{ height: 600 }}>
        <AgGridReact
          columnDefs={columnDefs}
          rowModelType="infinite"
          cacheBlockSize={100}
          maxBlocksInCache={10}
          rowHeight={34}
          headerHeight={30}
          defaultColDef={{ sortable: true, resizable: true }}
          onGridReady={onGridReady}
        />
      </div>
    </section>
  );
}
