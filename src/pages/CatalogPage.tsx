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
import { useSearchParams } from "react-router-dom";
import { rest } from "../lib/supabase";
import { CatalogFilters } from "../components/catalog/CatalogFilters";
import { ItemDetailDialog } from "../components/catalog/ItemDetailDialog";
import {
  fetchCatalogPage,
  fetchCategoryOptions,
  type CatalogFilters as F,
  type ItemRow,
} from "../lib/catalogQueries";
import { asAttrArray, formatYyMm } from "../lib/utils";

ModuleRegistry.registerModules([AllCommunityModule]);

const DEFAULT_FILTERS: F = { search: "", large: null, medium: null, small: null, source: null };

function getSourceLabel(item: ItemRow): string {
  const s = item.source;
  if (s === "mdm") return "신규";
  if (s === "bulk_upload") return "업로드";
  return "기존";
}

function SourceCell({ data }: ICellRendererParams<ItemRow>) {
  if (!data) return null;
  const yyMm = formatYyMm(data.created_at);
  const label = getSourceLabel(data);
  const cls =
    data.source === "mdm"
      ? "b-blue"
      : data.source === "bulk_upload"
        ? "b-warn"
        : "b-draft";
  return (
    <span className={`badge ${cls} flex flex-col items-center leading-tight gap-0.5 py-1 whitespace-nowrap`}>
      <span className="font-mono text-[10px]">{yyMm}</span>
      <span>{label}</span>
    </span>
  );
}

function CodeCell({ value }: ICellRendererParams<ItemRow>) {
  if (!value) return null;
  return <span className="font-mono font-semibold" style={{ color: "var(--c-accent-500)" }}>{value}</span>;
}

function NameCell({ data }: ICellRendererParams<ItemRow>) {
  if (!data) return null;
  const norm = data.normalized_name;
  const name = data.item_name;
  const attrs = asAttrArray(data.attributes).filter((a) => a.value && a.value !== "-" && a.value !== "0");
  const parts: string[] = [];
  if (data.model) parts.push(`모델: ${data.model}`);
  attrs.slice(0, 3).forEach((a) => parts.push(`${a.name}: ${a.value}`));
  const more = attrs.length > 3 ? ` 외 ${attrs.length - 3}건` : "";
  return (
    <div className="flex flex-col min-w-0 leading-tight py-1">
      <span className="font-medium truncate" title={norm || name || ""}>
        {norm || name || "-"}
      </span>
      {norm && norm !== name && (
        <span className="text-[11px] text-text-sub truncate" title={name || ""}>
          기존 품목명: {name}
        </span>
      )}
      {(parts.length > 0) && (
        <span className="text-[11px] text-text-sub truncate" title={parts.join(" / ") + more}>
          {parts.join(" / ")}{more}
        </span>
      )}
    </div>
  );
}

export function CatalogPage() {
  const [filters, setFilters] = useState<F>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<F>(DEFAULT_FILTERS);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedItem, setSelectedItem] = useState<ItemRow | null>(null);
  const gridApiRef = useRef<GridApi | null>(null);
  const [pageState, setPageState] = useState({ page: 0, pageSize: 50, totalPages: 1 });
  const [searchParams, setSearchParams] = useSearchParams();

  // 딥링크 (/item/:id → /catalog?item=값) — 단일 품목 fetch 후 상세 모달 자동 오픈
  useEffect(() => {
    const key = searchParams.get("item");
    if (!key) return;
    let cancelled = false;
    (async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
      const filter: Record<string, string> = isUuid
        ? { id: `eq.${key}` }
        : { or: `(item_code.eq.${key},item_code_display.eq.${key},legacy_code.eq.${key})` };
      try {
        const arr = await rest<ItemRow[]>("GET", "items", { params: { ...filter, select: "*", limit: "1" } });
        if (!cancelled && arr[0]) setSelectedItem(arr[0]);
      } catch { /* 못 찾으면 모달 없이 카탈로그 표시 */ }
      if (!cancelled) {
        const next = new URLSearchParams(searchParams);
        next.delete("item");
        setSearchParams(next, { replace: true }); // 새로고침/뒤로가기 깔끔
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams, setSearchParams]);

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
    queryKey: ["catalog-category-options"],
    queryFn: fetchCategoryOptions,
    staleTime: 5 * 60_000,
  });

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
          // total은 서버가 항상 반환 → lastRow로 항상 전달해야 전체 페이지수가 고정됨
          // (미전달 시 Infinite 모델이 블록을 로드할 때마다 총 페이지가 늘어남)
          params.successCallback(rows, total);
        } catch (e) {
          console.error("[catalog] fetch error", e);
          params.failCallback();
        }
      },
    };
  }, []);

  useEffect(() => {
    if (!gridApiRef.current) return;
    gridApiRef.current.setGridOption("datasource", makeDatasource(appliedFilters));
  }, [appliedFilters, makeDatasource]);

  // M-IN-1 패턴: 모든 셀 cell-readonly (catalog 전체 read-only). 컬럼 그룹화 (분류).
  const columnDefs = useMemo(
    () => [
      {
        headerName: "구분",
        field: "source" as keyof ItemRow,
        width: 75,
        pinned: "left" as const,
        cellRenderer: SourceCell,
        sortable: false,
        cellClass: "cell-readonly flex items-center justify-center",
      },
      {
        headerName: "품목코드",
        field: "item_code_display" as keyof ItemRow,
        width: 150,
        pinned: "left" as const,
        cellRenderer: CodeCell,
        cellClass: "cell-link num",
      },
      { headerName: "대분류", field: "large_category" as keyof ItemRow, width: 110, cellClass: "cell-readonly", valueFormatter: (p: { value: string | null }) => p.value || "—" },
      { headerName: "중분류", field: "medium_category" as keyof ItemRow, width: 130, cellClass: "cell-readonly", valueFormatter: (p: { value: string | null }) => p.value || "—" },
      { headerName: "소분류", field: "small_category" as keyof ItemRow, width: 140, cellClass: "cell-readonly", valueFormatter: (p: { value: string | null }) => p.value || "—" },
      {
        headerName: "품명",
        field: "item_name" as keyof ItemRow,
        flex: 1,
        minWidth: 280,
        cellRenderer: NameCell,
        autoHeight: true,
        cellClass: "cell-readonly",
      },
      {
        headerName: "규격",
        field: "spec" as keyof ItemRow,
        flex: 1,
        minWidth: 180,
        cellClass: "cell-readonly",
      },
      {
        headerName: "배포",
        width: 70,
        sortable: false,
        cellRenderer: () => <span className="text-text-sub">-</span>,
        cellClass: "cell-readonly num text-center",
      },
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
            품목마스터 ▸ 카탈로그
            <span className="text-xs text-gray-500 font-normal ml-2">/ catalog</span>
          </h1>
          <div className="meta">활성 items 전수 조회 · AG-Grid Infinite + Supabase range · 갱신: 실시간</div>
        </div>
        <div className="actions">
          <button className="btn-sec" type="button" disabled title="다음 단계">엑셀 다운로드</button>
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
              <select
                value={pageState.pageSize}
                onChange={(e) => gridApiRef.current?.setGridOption("paginationPageSize", Number(e.target.value))}
              >
                {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}개</option>)}
              </select>
              <button className="nav" onClick={() => gridApiRef.current?.paginationGoToPreviousPage()} disabled={pageState.page <= 0}>‹</button>
              <span className="pos">{pageState.page + 1} / {totalPages}</span>
              <button className="nav" onClick={() => gridApiRef.current?.paginationGoToNextPage()} disabled={pageState.page >= totalPages - 1}>›</button>
            </div>
          );
        })()}
      />

      <div className="ag-theme-quartz catalog-grid" style={{ height: 600, cursor: "pointer", marginTop: 14 }}>
        <AgGridReact
          columnDefs={columnDefs}
          rowModelType="infinite"
          cacheBlockSize={100}
          maxBlocksInCache={10}
          rowHeight={56}
          headerHeight={36}
          suppressCellFocus
          suppressMenuHide
          defaultColDef={{
            sortable: true,
            resizable: true,
            filter: "agTextColumnFilter",
            menuTabs: ["filterMenuTab", "generalMenuTab"],
          }}
          pagination
          paginationPageSize={50}
          suppressPaginationPanel
          onPaginationChanged={onPaginationChanged}
          onGridReady={onGridReady}
          onRowClicked={(e) => {
            if (e.data) setSelectedItem(e.data as ItemRow);
          }}
        />
      </div>

      <ItemDetailDialog
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </section>
  );
}
