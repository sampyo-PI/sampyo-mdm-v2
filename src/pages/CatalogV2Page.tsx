import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  type GridApi,
  type GridReadyEvent,
  type IDatasource,
  type IGetRowsParams,
  type ICellRendererParams,
} from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { CatalogFilters } from "../components/catalog/CatalogFilters";
import type { CatalogFilters as F } from "../lib/catalogQueries";
import { fetchCat2CatalogPage, fetchCat2CategoryOptions, type Cat2Row } from "../lib/cat2Queries";

ModuleRegistry.registerModules([AllCommunityModule]);

const DEFAULT_FILTERS: F = { search: "", large: null, medium: null, small: null, source: null };

function CodeCell({ value }: ICellRendererParams<Cat2Row>) {
  if (!value) return <span className="text-text-sub">—</span>;
  return <span className="font-mono font-semibold" style={{ color: "var(--c-accent-500)" }}>{value}</span>;
}

function NameCell({ data }: ICellRendererParams<Cat2Row>) {
  if (!data) return null;
  const parts: string[] = [];
  if (data.manufacturer) parts.push(`제조사: ${data.manufacturer}`);
  if (data.model) parts.push(`모델: ${data.model}`);
  return (
    <div className="flex flex-col min-w-0 leading-tight py-1">
      <span className="font-medium truncate" title={data.item_name || ""}>{data.item_name || "-"}</span>
      {parts.length > 0 && (
        <span className="text-[11px] text-text-sub truncate" title={parts.join(" / ")}>{parts.join(" / ")}</span>
      )}
    </div>
  );
}

export function CatalogV2Page() {
  const [filters, setFilters] = useState<F>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<F>(DEFAULT_FILTERS);
  const [totalCount, setTotalCount] = useState(0);
  const gridApiRef = useRef<GridApi | null>(null);
  const [pageState, setPageState] = useState({ page: 0, pageSize: 50, totalPages: 1 });

  const onPaginationChanged = useCallback(() => {
    const api = gridApiRef.current;
    if (!api) return;
    setPageState({
      page: api.paginationGetCurrentPage(),
      pageSize: api.paginationGetPageSize(),
      totalPages: Math.max(1, api.paginationGetTotalPages()),
    });
  }, []);

  const categoryOptions = useQuery({
    queryKey: ["cat2-category-options"],
    queryFn: fetchCat2CategoryOptions,
    staleTime: 5 * 60_000,
  });

  const makeDatasource = useCallback((f: F): IDatasource => {
    return {
      getRows: async (params: IGetRowsParams) => {
        try {
          const sort = params.sortModel[0];
          const { rows, total } = await fetchCat2CatalogPage(
            f, params.startRow, params.endRow,
            sort?.colId ?? "legacy_code", sort ? sort.sort === "asc" : true,
          );
          setTotalCount(total);
          params.successCallback(rows, total);
        } catch (e) {
          console.error("[cat2-catalog] fetch error", e);
          params.failCallback();
        }
      },
    };
  }, []);

  useEffect(() => {
    if (!gridApiRef.current) return;
    gridApiRef.current.setGridOption("datasource", makeDatasource(appliedFilters));
  }, [appliedFilters, makeDatasource]);

  const columnDefs = useMemo(
    () => [
      { headerName: "기존품목코드", field: "legacy_code" as keyof Cat2Row, width: 150, pinned: "left" as const, cellRenderer: CodeCell, cellClass: "num" },
      { headerName: "대분류", field: "large_category" as keyof Cat2Row, width: 110, cellClass: "cell-readonly", valueFormatter: (p: { value: string | null }) => p.value || "—" },
      { headerName: "중분류", field: "medium_category" as keyof Cat2Row, width: 130, cellClass: "cell-readonly", valueFormatter: (p: { value: string | null }) => p.value || "—" },
      { headerName: "소분류", field: "small_category" as keyof Cat2Row, width: 140, cellClass: "cell-readonly", valueFormatter: (p: { value: string | null }) => p.value || "—" },
      { headerName: "세부유형", field: "sub_type" as keyof Cat2Row, width: 130, cellClass: "cell-readonly", valueFormatter: (p: { value: string | null }) => p.value || "—" },
      { headerName: "품명", field: "item_name" as keyof Cat2Row, flex: 1, minWidth: 240, cellRenderer: NameCell, autoHeight: true, cellClass: "cell-readonly" },
      { headerName: "규격", field: "spec" as keyof Cat2Row, flex: 1, minWidth: 180, cellClass: "cell-readonly", valueFormatter: (p: { value: string | null }) => p.value || "—" },
      {
        headerName: "재검토", field: "needs_review" as keyof Cat2Row, width: 80, sortable: false,
        cellRenderer: (p: ICellRendererParams<Cat2Row>) => p.data?.needs_review
          ? <span className="badge b-warn">필요</span> : <span className="text-text-sub">—</span>,
        cellClass: "num text-center",
      },
    ],
    [],
  );

  const onGridReady = useCallback((e: GridReadyEvent) => {
    gridApiRef.current = e.api;
    e.api.setGridOption("datasource", makeDatasource(appliedFilters));
  }, [appliedFilters, makeDatasource]);

  return (
    <section className="page-card">
      <div className="page-h">
        <div>
          <h1>
            품목마스터 ▸ 표준 카탈로그 (신규)
          </h1>
        </div>
      </div>

      <style>{`
        .catalog-grid .ag-paging-panel { display: none; }
        .cat-pager { display: inline-flex; align-items: center; gap: 6px; font-size: var(--app-fs-sm); color: var(--c-text-sub); }
        .cat-pager select { border: 1px solid var(--c-border); border-radius: 6px; padding: 5px 8px; font-size: var(--app-fs-sm); color: var(--c-text); }
        .cat-pager .nav { width: 28px; height: 28px; border: 1px solid var(--c-border); background: #fff; border-radius: 6px; cursor: pointer; color: var(--c-navy-600); font-size: 14px; line-height: 1; }
        .cat-pager .nav:hover:not(:disabled) { background: #eff6ff; border-color: var(--c-navy-600); }
        .cat-pager .nav:disabled { opacity: .4; cursor: not-allowed; }
        .cat-pager .pos { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--c-navy-600); }
      `}</style>

      <CatalogFilters
        filters={filters}
        setFilters={setFilters}
        options={categoryOptions.data}
        isOptionsLoading={categoryOptions.isLoading}
        totalCount={totalCount}
        onSearch={() => setAppliedFilters(filters)}
        extra={(() => {
          const totalPages = Math.max(1, Math.ceil(totalCount / pageState.pageSize));
          return (
            <div className="cat-pager">
              <select value={pageState.pageSize} onChange={(e) => gridApiRef.current?.setGridOption("paginationPageSize", Number(e.target.value))}>
                {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}개</option>)}
              </select>
              <button className="nav" onClick={() => gridApiRef.current?.paginationGoToPreviousPage()} disabled={pageState.page <= 0}>‹</button>
              <span className="pos">{pageState.page + 1} / {totalPages}</span>
              <button className="nav" onClick={() => gridApiRef.current?.paginationGoToNextPage()} disabled={pageState.page >= totalPages - 1}>›</button>
            </div>
          );
        })()}
      />

      <div className="ag-theme-quartz catalog-grid" style={{ height: 600, marginTop: 14 }}>
        <AgGridReact
          columnDefs={columnDefs}
          rowModelType="infinite"
          cacheBlockSize={100}
          maxBlocksInCache={10}
          rowHeight={56}
          headerHeight={36}
          suppressCellFocus
          suppressMenuHide
          defaultColDef={{ sortable: true, resizable: true, filter: "agTextColumnFilter", menuTabs: ["filterMenuTab", "generalMenuTab"] }}
          pagination
          paginationPageSize={50}
          suppressPaginationPanel
          onPaginationChanged={onPaginationChanged}
          onGridReady={onGridReady}
        />
      </div>
    </section>
  );
}
