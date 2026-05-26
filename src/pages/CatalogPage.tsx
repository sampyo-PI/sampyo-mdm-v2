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
  const gridApiRef = useRef<GridApi | null>(null);

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
          const lastRow = params.endRow >= total ? total : undefined;
          params.successCallback(rows, lastRow);
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
      {
        headerName: "분류",
        children: [
          { headerName: "대", field: "large_category" as keyof ItemRow, width: 100, cellClass: "cell-readonly" },
          { headerName: "중", field: "medium_category" as keyof ItemRow, width: 120, cellClass: "cell-readonly" },
          { headerName: "소", field: "small_category" as keyof ItemRow, width: 130, cellClass: "cell-readonly" },
        ],
      },
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

  // M-IN-1 footer 패턴: pinnedBottomRowData로 총 건수 표시
  const pinnedBottom = useMemo(
    () => [
      {
        __isFooter: true,
        source: null,
        item_code_display: "합계",
        large_category: null,
        medium_category: null,
        small_category: null,
        item_name: `${totalCount.toLocaleString("ko-KR")} 건`,
        spec: null,
      } as unknown as ItemRow,
    ],
    [totalCount],
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

      <div className="section-title">품목 목록 (정렬·필터·리사이즈)</div>
      <div className="ag-theme-quartz" style={{ height: 600 }}>
        <AgGridReact
          columnDefs={columnDefs}
          rowModelType="infinite"
          cacheBlockSize={100}
          maxBlocksInCache={10}
          rowHeight={56}
          headerHeight={30}
          groupHeaderHeight={26}
          suppressCellFocus
          defaultColDef={{ sortable: true, resizable: true }}
          pinnedBottomRowData={pinnedBottom}
          getRowStyle={(p) =>
            (p.data as unknown as { __isFooter?: boolean })?.__isFooter
              ? { background: "#f0f2f7", fontWeight: 600 }
              : undefined
          }
          onGridReady={onGridReady}
        />
      </div>
    </section>
  );
}
