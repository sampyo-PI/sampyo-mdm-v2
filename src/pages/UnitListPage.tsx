import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef, type GridReadyEvent, type ICellRendererParams } from "ag-grid-community";
import { rest, rpc } from "../lib/supabase";

ModuleRegistry.registerModules([AllCommunityModule]);

type UnitRow = { code: string; name: string; description: string | null; unit_type: string; is_active: boolean };
type Unit = { code: string; name: string; description: string; unit_type: string; usage: number; is_active: boolean };

const TypeBadge = ({ value }: { value: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    stock: { label: "재고", cls: "stock" }, purchase: { label: "구매", cls: "purchase" }, both: { label: "공용", cls: "both" },
  };
  const m = map[value] ?? map.both;
  return <span className={`badge-type ${m.cls}`}>{m.label}</span>;
};
const UsageCell = ({ value, max }: { value: number; max: number }) => {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span className="t-mono t-meta" style={{ minWidth: 50 }}>{value.toLocaleString()}</span>
      <div className="usage-bar"><div className="fill" style={{ width: `${pct}%` }}></div></div>
    </div>
  );
};
const StatusBadge = ({ on }: { on: boolean }) => <span className={`badge-status ${on ? "active" : "inactive"}`}>{on ? "사용" : "미사용"}</span>;
const CodeChip = ({ value }: { value: string }) => <span className="unit-code">{value}</span>;
const ActionsCell = () => (
  <div className="row-acts">
    <button className="ic-btn"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg></button>
    <button className="ic-btn del"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1.5 14a2 2 0 0 1-2 2H8.5a2 2 0 0 1-2-2L5 6"/></svg></button>
  </div>
);

export function UnitListPage() {
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["v2-units"],
    queryFn: async () => {
      const [units, usage] = await Promise.all([
        rest<UnitRow[]>("GET", "units", { params: { select: "code,name,description,unit_type,is_active", order: "sort_order.asc", limit: "500" } }),
        rpc<Record<string, number>>("get_unit_usage_counts"),
      ]);
      return units.map<Unit>((u) => ({
        code: u.code, name: u.name, description: u.description ?? "",
        unit_type: u.unit_type, is_active: u.is_active, usage: usage[u.code] ?? 0,
      }));
    },
    staleTime: 60_000,
  });

  const maxUsage = useMemo(() => rows.reduce((m, r) => Math.max(m, r.usage), 0), [rows]);
  const totalItemUsage = useMemo(() => rows.reduce((s, r) => s + r.usage, 0), [rows]);
  const topUnit = useMemo(() => [...rows].sort((a, b) => b.usage - a.usage)[0], [rows]);
  const activeCnt = useMemo(() => rows.filter(r => r.is_active).length, [rows]);

  const columnDefs = useMemo<ColDef<Unit>[]>(() => ([
    { headerName: "코드", field: "code", width: 90, cellRenderer: (p: ICellRendererParams<Unit>) => <CodeChip value={p.value} /> },
    { headerName: "단위명", field: "name", width: 130, cellStyle: { fontWeight: 600 } as any },
    { headerName: "타입", field: "unit_type", width: 90, cellRenderer: (p: ICellRendererParams<Unit>) => <TypeBadge value={p.value} /> },
    { headerName: "사용 빈도 (items)", field: "usage", width: 200, cellRenderer: (p: ICellRendererParams<Unit>) => <UsageCell value={p.value} max={maxUsage} />, sort: "desc" },
    { headerName: "상태", field: "is_active", width: 80, cellRenderer: (p: ICellRendererParams<Unit>) => <StatusBadge on={p.value} />, filterValueGetter: (p) => p.data?.is_active ? "사용" : "미사용" },
    { headerName: "설명", field: "description", width: 280, cellStyle: { color: "#64748b", fontSize: "13px" } as any },
    { headerName: "관리", width: 90, cellRenderer: () => <ActionsCell />, sortable: false, filter: false, cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any },
  ]), [maxUsage]);

  const onGridReady = useCallback((e: GridReadyEvent) => e.api.sizeColumnsToFit(), []);

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>단위 관리<span className="text-xs text-gray-500 font-normal ml-2">/ unit</span></h1>
          <div className="meta">{rows.length}개 단위 마스터 · ERP 재고단위는 별도 마스터 (법인별 14×976행){isLoading && " · 불러오는 중…"}</div>
        </div>
        <div className="actions">
          <button className="btn-primary">＋ 단위 추가</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3" style={{ marginTop: 16 }}>
        <div className="stat-card">
          <div className="stat-label">단위 마스터</div>
          <div className="stat-val">{rows.length}</div>
          <div className="stat-sub">사용 중 {activeCnt} · 미사용 {rows.length - activeCnt}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">items 사용 (재고단위)</div>
          <div className="stat-val">{totalItemUsage.toLocaleString()}</div>
          <div className="stat-sub">{topUnit ? `${topUnit.code} ${topUnit.usage.toLocaleString()} 최다` : "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">ERP 재고단위명 (별도)</div>
          <div className="stat-val">976 <small>× 14법인</small></div>
          <div className="stat-sub">erp_basic_units_by_company</div>
        </div>
      </div>

      <div className="callout-info">
        💡 MDM <strong>units</strong> 마스터 = 시스템 내 표준. ERP는 법인별로 <strong>erp_basic_units_by_company</strong>를 따로 보유 (14법인 × 976행). erp-sync는 ERP 우선 lookup → units fallback (옵션 2 매핑).
      </div>

      <div className="unit-toolbar">
        <div className="search-box">
          <svg className="ic-search" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="단위명 · 코드 검색…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="t-meta">전체 <strong className="t-navy">{rows.length}개</strong></span>
      </div>

      <div className="ag-theme-quartz" style={{ height: 540 }}>
        <AgGridReact<Unit>
          rowData={rows}
          columnDefs={columnDefs}
          rowHeight={46} headerHeight={36}
          suppressCellFocus suppressMenuHide
          defaultColDef={{ sortable: true, resizable: true, filter: "agTextColumnFilter", menuTabs: ["filterMenuTab", "generalMenuTab"] }}
          pagination paginationPageSize={50} paginationPageSizeSelector={[25, 50, 100]}
          quickFilterText={search}
          onGridReady={onGridReady}
        />
      </div>
    </section>
  );
}

const PAGE_STYLES = `
.stat-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; }
.stat-card .stat-label { font-size: 12px; color: #64748b; }
.stat-card .stat-val { font-size: 22px; font-weight: 700; color: #003876; line-height: 1.1; margin-top: 4px; }
.stat-card .stat-val small { font-size: 13px; font-weight: 500; color: #94a3b8; }
.stat-card .stat-sub { font-size: 11px; color: #94a3b8; margin-top: 4px; }

.callout-info { background: #eff6ff; border-left: 3px solid #003876; padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #1e293b; margin-top: 16px; }

.unit-toolbar { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin: 16px 0 12px 0; display: flex; align-items: center; gap: 12px; }
.unit-toolbar .search-box { position: relative; flex: 1; max-width: 380px; }
.unit-toolbar .search-box input { width: 100%; padding: 8px 12px 8px 34px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: #1f2937; }
.unit-toolbar .search-box input:focus { outline: none; border-color: #003876; box-shadow: 0 0 0 2px rgba(0,56,118,0.1); }
.unit-toolbar .search-box .ic-search { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #94a3b8; }

.btn-primary { background: #003876; color: #fff; border: 1px solid #003876; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-primary:hover { background: #002a5c; }

.unit-code { color: #003876; font-weight: 700; font-size: 12px; padding: 1px 8px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, monospace; }
.badge-type { display: inline-block; padding: 1px 7px; border-radius: 4px; font-size: 11px; font-weight: 600; line-height: 1.5; }
.badge-type.stock { background: #ecfdf5; color: #047857; border: 1px solid #bbf7d0; }
.badge-type.purchase { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.badge-type.both { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

.badge-status { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 600; line-height: 1.5; }
.badge-status.active { background: #ecfdf5; color: #047857; border: 1px solid #bbf7d0; }
.badge-status.inactive { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }

.usage-bar { width: 100px; height: 5px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
.usage-bar .fill { height: 100%; background: linear-gradient(90deg, #003876, #1e40af); }

.row-acts { display: flex; gap: 4px; justify-content: center; }
.row-acts .ic-btn { width: 28px; height: 28px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; border-radius: 6px; color: #475569; display: inline-flex; align-items: center; justify-content: center; }
.row-acts .ic-btn:hover { background: #eff6ff; color: #003876; border-color: #003876; }
.row-acts .ic-btn.del:hover { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
.row-acts svg { width: 14px; height: 14px; }

.t-mono { font-family: ui-monospace, monospace; }
.t-meta { font-size: 13px; font-weight: 500; color: #64748b; }
.t-navy { color: #003876 !important; }
`;
