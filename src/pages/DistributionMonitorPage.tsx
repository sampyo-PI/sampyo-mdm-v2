import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef, type GridApi, type GridReadyEvent, type ICellRendererParams } from "ag-grid-community";
import { rest } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { GridPager } from "../components/common/GridPager";

ModuleRegistry.registerModules([AllCommunityModule]);

const FETCH_LIMIT = 2000;

type Status = "SUCCESS" | "FAILED" | "PENDING" | "PROCESSING" | "COMPLETED" | null;

type TargetErp = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  sort_order: number | null;
};

type InterfaceItem = {
  id: string;
  item_code: string;
  item_name: string;
  target_erp: string;
  interface_status: string;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
  item_request_id: string | null;
};

type ItemRow = {
  code: string;
  name: string;
  _has_failed: boolean;
} & Record<string, Status | string | boolean>;

async function fetchActiveErps(): Promise<TargetErp[]> {
  return rest<TargetErp[]>("GET", "target_erp_systems", {
    params: {
      select: "id,code,name,is_active,sort_order",
      is_active: "eq.true",
      order: "sort_order.asc",
    },
  });
}

async function fetchInterfaceItems(): Promise<InterfaceItem[]> {
  // ⚠️ erp_interface_items 는 대용량(33,000+). 전량 fetch 금지 — 최근 FETCH_LIMIT 건만.
  return rest<InterfaceItem[]>("GET", "erp_interface_items", {
    params: {
      select: "id,item_code,item_name,target_erp,interface_status,error_message,processed_at,created_at,item_request_id",
      order: "created_at.desc",
      limit: String(FETCH_LIMIT),
    },
  });
}

const StatusCell = ({ value, title }: { value: Status; title?: string }) => {
  if (!value) return <span className="st-cell none" title="송신 대상 아님"><span className="st-icon">—</span></span>;
  const cls = value === "COMPLETED" ? "success" : value.toLowerCase();
  const icon =
    value === "SUCCESS" || value === "COMPLETED" ? "✓"
    : value === "FAILED" ? "✕"
    : value === "PENDING" ? "⏳"
    : "⟳";
  return <span className={`st-cell ${cls}`} title={title || value}><span className="st-icon">{icon}</span></span>;
};

const CodeChip = ({ value }: { value: string }) => <span className="code-chip">{value}</span>;

export function DistributionMonitorPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  const { data: erps = [], isLoading: erpLoading } = useQuery({
    queryKey: ["dist-target-erps"],
    queryFn: fetchActiveErps,
    staleTime: 60_000,
    enabled: isAdmin,
  });

  const { data: items = [], isLoading: itemsLoading, refetch, isFetching } = useQuery({
    queryKey: ["dist-interface-items"],
    queryFn: fetchInterfaceItems,
    staleTime: 30_000,
    enabled: isAdmin,
  });

  const isLoading = erpLoading || itemsLoading;

  // 재배포: 해당 item_code 의 FAILED 행만 PENDING 으로 전환
  const retry = useMutation({
    mutationFn: async (itemCode: string) => {
      await rest("PATCH", "erp_interface_items", {
        params: { item_code: `eq.${itemCode}`, interface_status: "eq.FAILED" },
        body: { interface_status: "PENDING", error_message: null, retry_count: 0 },
        prefer: "return=representation",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dist-interface-items"] });
      refetch();
    },
  });

  // item_code 별 그룹핑 → target_erp 별 상태 한 행에
  const rows = useMemo<ItemRow[]>(() => {
    const map = new Map<string, { code: string; name: string; byErp: Map<string, InterfaceItem> }>();
    for (const it of items) {
      let g = map.get(it.item_code);
      if (!g) {
        g = { code: it.item_code, name: it.item_name, byErp: new Map() };
        map.set(it.item_code, g);
      }
      // created_at desc 정렬 fetch → 첫(최신) 행만 유지
      if (!g.byErp.has(it.target_erp)) g.byErp.set(it.target_erp, it);
    }
    return Array.from(map.values()).map((g) => {
      const row: ItemRow = { code: g.code, name: g.name, _has_failed: false };
      for (const erp of erps) {
        const rec = g.byErp.get(erp.code);
        row[erp.code] = (rec?.interface_status as Status) ?? null;
        if (rec?.error_message) row[`${erp.code}__err`] = rec.error_message;
      }
      row._has_failed = erps.some((e) => g.byErp.get(e.code)?.interface_status === "FAILED");
      return row;
    });
  }, [items, erps]);

  const stats = useMemo(() => {
    const total = items.length;
    const isSuccess = (s: string) => s === "SUCCESS" || s === "COMPLETED";
    const success = items.filter((i) => isSuccess(i.interface_status)).length;
    const failed = items.filter((i) => i.interface_status === "FAILED").length;
    const pending = items.filter((i) => i.interface_status === "PENDING" || i.interface_status === "PROCESSING").length;
    const rate = total > 0 ? ((success / total) * 100).toFixed(1) : "0.0";
    return { total, success, failed, pending, rate };
  }, [items]);

  const columnDefs = useMemo<ColDef<ItemRow>[]>(() => ([
    { headerName: "품목코드", field: "code", width: 170, pinned: "left", cellRenderer: (p: ICellRendererParams<ItemRow>) => <CodeChip value={p.value} /> },
    { headerName: "품목명", field: "name", width: 220, pinned: "left", cellStyle: { fontWeight: 600 } as any },
    ...erps.map((erp): ColDef<ItemRow> => ({
      headerName: erp.code, field: erp.code, width: 70, headerTooltip: erp.name,
      cellRenderer: (p: ICellRendererParams<ItemRow>) => (
        <StatusCell value={p.value as Status} title={(p.data?.[`${erp.code}__err`] as string) || undefined} />
      ),
      cellStyle: { display: "flex", alignItems: "center", justifyContent: "center", padding: "0" } as any,
      filterValueGetter: (p) => (p.data?.[erp.code] as string) || "—",
      sortable: false,
    })),
    {
      headerName: "동작", width: 110, pinned: "right", sortable: false, filter: false,
      cellRenderer: (p: ICellRendererParams<ItemRow>) => p.data!._has_failed
        ? <div className="row-acts"><button className="ic-btn retry" disabled={retry.isPending} onClick={() => retry.mutate(p.data!.code)}>🔁 재배포</button></div>
        : <div className="row-acts"><span className="ok-dash">—</span></div>,
      cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any,
    },
  ]), [erps, retry]);

  const onGridReady = useCallback((e: GridReadyEvent) => {
    e.api.sizeColumnsToFit();
    setGridApi(e.api);
  }, []);

  // 상태 외부 필터 (전체/성공/실패/대기) — erp 셀 상태 기준
  const isExtPresent = useCallback(() => statusF !== "all", [statusF]);
  const doesExtPass = useCallback((node: any) => {
    if (statusF === "all") return true;
    const vals = erps.map((e) => node.data[e.code] as Status).filter(Boolean) as string[];
    if (statusF === "success") return vals.length > 0 && vals.every((s) => s === "SUCCESS" || s === "COMPLETED");
    if (statusF === "failed") return vals.some((s) => s === "FAILED");
    if (statusF === "pending") return vals.some((s) => s === "PENDING" || s === "PROCESSING");
    return true;
  }, [statusF, erps]);

  if (!isAdmin) {
    return (
      <section className="page-card" style={{ marginBottom: 0 }}>
        <style>{PAGE_STYLES}</style>
        <div className="page-h">
          <div>
            <h1>ERP 배포현황</h1>
          </div>
        </div>
        <div className="callout-info" style={{ borderLeftColor: "#b91c1c", background: "#fef2f2", color: "#7f1d1d" }}>
          이 페이지는 관리자(admin)만 볼 수 있습니다.
        </div>
      </section>
    );
  }

  const retryErr = retry.error instanceof Error ? retry.error.message : null;

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>ERP 배포현황</h1>
        </div>
        <div className="actions">
          <button className="btn-sec" onClick={() => refetch()} disabled={isFetching}>🔄 새로고침</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3" style={{ marginTop: 16 }}>
        <div className="stat-card"><div className="stat-icon total"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/></svg></div><div><div className="stat-val">{stats.total.toLocaleString()}</div><div className="stat-label">전체 배포 (최근 {FETCH_LIMIT.toLocaleString()}건)</div></div></div>
        <div className="stat-card"><div className="stat-icon success"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg></div><div><div className="stat-val success-c">{stats.success.toLocaleString()}</div><div className="stat-label">성공 ({stats.rate}%)</div></div></div>
        <div className="stat-card"><div className="stat-icon failed"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div><div><div className="stat-val failed-c">{stats.failed.toLocaleString()}</div><div className="stat-label">실패 (재배포 필요)</div></div></div>
        <div className="stat-card"><div className="stat-icon pending"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><div className="stat-val pending-c">{stats.pending.toLocaleString()}</div><div className="stat-label">대기 (PENDING + PROCESSING)</div></div></div>
      </div>

      <div className="callout-info">💡 erp-sync 미들웨어 1분 간격 폴링 · PENDING → MSSQL INSERT/UPDATE → SUCCESS / FAILED. 실패는 행에서 직접 재배포 가능. <strong>최근 {FETCH_LIMIT.toLocaleString()}건</strong>만 표시합니다.</div>

      {retryErr && (
        <div className="callout-info" style={{ borderLeftColor: "#b91c1c", background: "#fef2f2", color: "#7f1d1d" }}>
          재배포 요청 실패: {retryErr}
        </div>
      )}

      <div className="dist-toolbar">
        <div className="search-box">
          <svg className="ic-search" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="품목코드 · 품목명 검색…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option value="all">상태: 전체</option>
          <option value="success">성공만</option>
          <option value="failed">실패만</option>
          <option value="pending">대기만</option>
        </select>
        <span style={{ flex: 1 }}></span>
        <span className="count-chip">{rows.length.toLocaleString()}개 품목 그룹</span>
        <GridPager api={gridApi} pageSizeOptions={[25, 50, 100]} />
      </div>

      <div className="legend">
        <span style={{ fontWeight: 600 }}>범례:</span>
        <span className="lg-item"><span className="lg-icon success">✓</span> SUCCESS / COMPLETED</span>
        <span className="lg-item"><span className="lg-icon failed">✕</span> FAILED</span>
        <span className="lg-item"><span className="lg-icon pending">⏳</span> PENDING</span>
        <span className="lg-item"><span className="lg-icon processing">⟳</span> PROCESSING</span>
        <span className="lg-item"><span className="lg-icon none">—</span> 송신 대상 아님</span>
      </div>

      <div className="ag-theme-quartz" style={{ height: 520 }}>
        <AgGridReact<ItemRow>
          rowData={rows}
          columnDefs={columnDefs}
          rowHeight={44} headerHeight={36}
          suppressCellFocus suppressMenuHide
          loading={isLoading}
          overlayNoRowsTemplate={isLoading ? "데이터 로딩중…" : "배포 데이터가 없습니다."}
          defaultColDef={{ sortable: true, resizable: true, filter: "agTextColumnFilter", menuTabs: ["filterMenuTab", "generalMenuTab"] }}
          pagination paginationPageSize={50} suppressPaginationPanel
          quickFilterText={search}
          isExternalFilterPresent={isExtPresent}
          doesExternalFilterPass={doesExtPass}
          onGridReady={onGridReady}
        />
      </div>
    </section>
  );
}

const PAGE_STYLES = `
.stat-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; display: flex; align-items: center; gap: 14px; }
.stat-card .stat-icon { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 8px; }
.stat-card .stat-icon.total { background: #f1f5f9; color: #475569; }
.stat-card .stat-icon.success { background: #ecfdf5; color: #047857; }
.stat-card .stat-icon.failed { background: #fef2f2; color: #b91c1c; }
.stat-card .stat-icon.pending { background: #fef3c7; color: #92400e; }
.stat-card .stat-icon svg { width: 20px; height: 20px; }
.stat-card .stat-val { font-size: 22px; font-weight: 700; color: #003876; line-height: 1.1; }
.stat-card .stat-val.success-c { color: #047857; }
.stat-card .stat-val.failed-c { color: #b91c1c; }
.stat-card .stat-val.pending-c { color: #92400e; }
.stat-card .stat-label { font-size: 12px; color: #64748b; margin-top: 2px; }

.callout-info { background: #eff6ff; border-left: 3px solid #003876; padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #1e293b; margin-top: 16px; }

.dist-toolbar { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin: 16px 0 12px 0; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.dist-toolbar .search-box { position: relative; flex: 1; max-width: 380px; }
.dist-toolbar .search-box input { width: 100%; padding: 8px 12px 8px 34px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: #1f2937; }
.dist-toolbar .search-box .ic-search { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #94a3b8; }
.dist-toolbar select { padding: 7px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #475569; background: #fff; }
.dist-toolbar .count-chip { font-size: 12px; color: #64748b; }

.btn-sec { background: #fff; color: #003876; border: 1px solid #cbd5e1; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-sec:hover { background: #eff6ff; border-color: #003876; }
.btn-sec:disabled { opacity: 0.5; cursor: not-allowed; }

.code-chip { display: inline-block; padding: 1px 7px; border-radius: 4px; background: #f1f5f9; color: #003876; border: 1px solid #cbd5e1; font-family: ui-monospace, monospace; font-size: 12px; font-weight: 600; line-height: 1.5; }

.st-cell { display: inline-flex; align-items: center; justify-content: center; width: 100%; height: 100%; cursor: pointer; }
.st-cell .st-icon { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
.st-cell.success .st-icon { background: #ecfdf5; color: #047857; border: 1px solid #bbf7d0; }
.st-cell.failed .st-icon { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.st-cell.pending .st-icon { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.st-cell.processing .st-icon { background: #dbeafe; color: #003876; border: 1px solid #bfdbfe; }
.st-cell.none .st-icon { background: transparent; color: #cbd5e1; border: 1px dashed #e2e8f0; }

.row-acts { display: flex; gap: 4px; justify-content: center; }
.row-acts .ic-btn { height: 28px; padding: 0 10px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; border-radius: 6px; color: #475569; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; }
.row-acts .ic-btn.retry { background: #fef2f2; color: #b91c1c; border-color: #fecaca; font-weight: 600; }
.row-acts .ic-btn.retry:hover { background: #fee2e2; }
.row-acts .ic-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.row-acts .ok-dash { color: #cbd5e1; font-size: 12px; }

.legend { display: flex; align-items: center; gap: 14px; margin: 8px 0 4px 0; font-size: 12px; color: #64748b; }
.legend .lg-item { display: inline-flex; align-items: center; gap: 6px; }
.legend .lg-icon { width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; }
.legend .lg-icon.success { background: #ecfdf5; color: #047857; border: 1px solid #bbf7d0; }
.legend .lg-icon.failed { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.legend .lg-icon.pending { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.legend .lg-icon.processing { background: #dbeafe; color: #003876; border: 1px solid #bfdbfe; }
.legend .lg-icon.none { background: transparent; color: #cbd5e1; border: 1px dashed #e2e8f0; }
`;
