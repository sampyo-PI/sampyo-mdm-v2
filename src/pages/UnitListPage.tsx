import { useCallback, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef, type GridReadyEvent, type ICellRendererParams } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

type Unit = { code: string; name: string; description: string; unit_type: "stock" | "purchase" | "both"; usage: number; is_active: boolean };

const UNITS: Unit[] = [
  { code: "EA", name: "개", description: "낱개 단위 (가장 보편)", unit_type: "both", usage: 18432, is_active: true },
  { code: "SET", name: "세트", description: "조립 부품 묶음", unit_type: "both", usage: 2841, is_active: true },
  { code: "KG", name: "킬로그램", description: "중량 단위", unit_type: "both", usage: 2103, is_active: true },
  { code: "M", name: "미터", description: "길이 (전선·파이프)", unit_type: "both", usage: 1842, is_active: true },
  { code: "L", name: "리터", description: "액체 부피", unit_type: "both", usage: 987, is_active: true },
  { code: "BOX", name: "박스", description: "박스 단위 (PACK)", unit_type: "purchase", usage: 654, is_active: true },
  { code: "ROLL", name: "롤", description: "권취 (테이프·필름)", unit_type: "both", usage: 521, is_active: true },
  { code: "M2", name: "제곱미터", description: "면적", unit_type: "both", usage: 387, is_active: true },
  { code: "M3", name: "세제곱미터", description: "체적", unit_type: "both", usage: 312, is_active: true },
  { code: "PR", name: "쌍", description: "장갑·신발 등", unit_type: "both", usage: 298, is_active: true },
  { code: "TON", name: "톤", description: "1000 kg", unit_type: "both", usage: 234, is_active: true },
  { code: "PCK", name: "팩", description: "포장 단위", unit_type: "purchase", usage: 189, is_active: true },
  { code: "BAG", name: "백", description: "포대", unit_type: "both", usage: 142, is_active: true },
  { code: "DR", name: "드럼", description: "드럼통 (보통 200L)", unit_type: "both", usage: 121, is_active: true },
  { code: "CAN", name: "캔", description: "캔 단위 (페인트 등)", unit_type: "both", usage: 98, is_active: true },
  { code: "G", name: "그램", description: "1/1000 kg", unit_type: "both", usage: 67, is_active: true },
  { code: "MM", name: "밀리미터", description: "1/1000 m", unit_type: "both", usage: 54, is_active: true },
  { code: "CM", name: "센티미터", description: "1/100 m", unit_type: "both", usage: 32, is_active: true },
  { code: "BL", name: "벌", description: "의류 (작업복 등)", unit_type: "both", usage: 18, is_active: false },
  { code: "DOZ", name: "다스", description: "12개", unit_type: "both", usage: 5, is_active: false },
];

const TypeBadge = ({ value }: { value: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    stock: { label: "재고", cls: "stock" }, purchase: { label: "구매", cls: "purchase" }, both: { label: "공용", cls: "both" },
  };
  const m = map[value] ?? map.both;
  return <span className={`badge-type ${m.cls}`}>{m.label}</span>;
};
const UsageCell = ({ value }: { value: number }) => {
  const pct = Math.min(100, Math.round((value / 18500) * 100));
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

  const columnDefs = useMemo<ColDef<Unit>[]>(() => ([
    { headerName: "코드", field: "code", width: 90, cellRenderer: (p: ICellRendererParams<Unit>) => <CodeChip value={p.value} /> },
    { headerName: "단위명", field: "name", width: 130, cellStyle: { fontWeight: 600 } as any },
    { headerName: "타입", field: "unit_type", width: 90, cellRenderer: (p: ICellRendererParams<Unit>) => <TypeBadge value={p.value} /> },
    { headerName: "사용 빈도 (items)", field: "usage", width: 200, cellRenderer: (p: ICellRendererParams<Unit>) => <UsageCell value={p.value} />, sort: "desc" },
    { headerName: "상태", field: "is_active", width: 80, cellRenderer: (p: ICellRendererParams<Unit>) => <StatusBadge on={p.value} />, filterValueGetter: (p) => p.data?.is_active ? "사용" : "미사용" },
    { headerName: "설명", field: "description", width: 280, cellStyle: { color: "#64748b", fontSize: "13px" } as any },
    { headerName: "관리", width: 90, cellRenderer: () => <ActionsCell />, sortable: false, filter: false, cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any },
  ]), []);

  const onGridReady = useCallback((e: GridReadyEvent) => e.api.sizeColumnsToFit(), []);

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>단위 관리<span className="text-xs text-gray-500 font-normal ml-2">/ unit</span></h1>
          <div className="meta">91개 단위 마스터 · ERP 재고단위는 별도 마스터 (법인별 14×976행)</div>
        </div>
        <div className="actions">
          <button className="btn-primary">＋ 단위 추가</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3" style={{ marginTop: 16 }}>
        <div className="stat-card">
          <div className="stat-label">단위 마스터</div>
          <div className="stat-val">91</div>
          <div className="stat-sub">사용 중 87 · 미사용 4</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">items 사용 (재고단위)</div>
          <div className="stat-val">29,977</div>
          <div className="stat-sub">EA 18,432 (62%) · SET 2,841</div>
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
        <span className="t-meta">전체 <strong className="t-navy">91개</strong> (목업 20행 표시)</span>
      </div>

      <div className="ag-theme-quartz" style={{ height: 540 }}>
        <AgGridReact<Unit>
          rowData={UNITS}
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
