import { useCallback, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef, type GridReadyEvent, type ICellRendererParams } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

const ERP_LIST = ["SPI", "NRC", "TYC", "DAMUL", "SPRC", "NDW", "HM", "SPENR", "SPRMC", "SPENC", "SPRAIL", "SPE"];
type Status = "SUCCESS" | "FAILED" | "PENDING" | "PROCESSING" | null;
type ItemRow = {
  code: string; name: string; action: "INSERT" | "UPDATE" | "REVOKE";
  _has_failed: boolean;
} & Record<string, Status | string | boolean>;

const ITEM_BASE: Array<{ code: string; name: string; action: "INSERT" | "UPDATE" | "REVOKE" }> = [
  { code: "M-LN-CAB-0001-00", name: "TC 100M 케이블", action: "INSERT" },
  { code: "M-LB-BER-0025-00", name: "베어링 6205 SKF", action: "INSERT" },
  { code: "M-LM-MOT-0075-00", name: "송풍기 모터 75kW", action: "UPDATE" },
  { code: "M-FP-PMP-0012-00", name: "유압펌프 PCV2.2", action: "INSERT" },
  { code: "M-CF-FLT-0003-00", name: "공기필터 H13급", action: "INSERT" },
  { code: "M-CV-BLT-0088-00", name: "컨베이어벨트 #44", action: "INSERT" },
  { code: "M-CG-GRD-0045-00", name: "기어드모터 PCV 2.2kW", action: "INSERT" },
  { code: "M-CC-CHN-0012-00", name: "체인 RS60", action: "UPDATE" },
  { code: "M-SL-CYL-0037-00", name: "실린더 3MC8T8727-5", action: "INSERT" },
  { code: "M-SP-SPR-0008-00", name: "스프링 압축 50x100", action: "INSERT" },
  { code: "E-BL-WIR-0112-00", name: "전선 IV 2.5sq", action: "INSERT" },
  { code: "E-PS-PWR-0019-00", name: "전원공급장치 24V", action: "INSERT" },
  { code: "P-PL-CPU-0004-00", name: "PLC 메인 CPU", action: "INSERT" },
  { code: "P-PS-SNS-0123-00", name: "온도센서 PT100", action: "INSERT" },
  { code: "B-SC-SCR-0234-00", name: "스크류 M8x30", action: "INSERT" },
  { code: "B-NT-NUT-0112-00", name: "너트 M10", action: "INSERT" },
  { code: "B-BL-BLT-0087-00", name: "볼트 M16x60", action: "INSERT" },
  { code: "M-LB-BER-0099-00", name: "베어링 6309 NSK", action: "UPDATE" },
  { code: "M-CV-BLT-0022-00", name: "컨베이어 분쇄 #12", action: "REVOKE" },
  { code: "M-GR-GRS-0004-00", name: "그리스 EP2", action: "INSERT" },
];

const FAILED_CASES = new Set(["E-BL-WIR-0112-00:SPI", "M-SL-CYL-0037-00:TYC", "P-PS-SNS-0123-00:SPENC", "M-CV-BLT-0022-00:SPRAIL"]);
function buildStatus(i: number, erp: string): Status {
  const targets = i % 3 === 0 ? ["SPI", "TYC", "SPENC"] : i % 3 === 1 ? ["SPI", "SPENC", "SPRAIL", "SPE"] : ["TYC", "SPRC", "DAMUL"];
  if (!targets.includes(erp)) return null;
  if (FAILED_CASES.has(ITEM_BASE[i].code + ":" + erp)) return "FAILED";
  if (i >= 18) return "PENDING";
  if (i >= 16) return "PROCESSING";
  return "SUCCESS";
}

const ROWS: ItemRow[] = ITEM_BASE.map((item, i) => {
  const row: ItemRow = { code: item.code, name: item.name, action: item.action, _has_failed: false };
  ERP_LIST.forEach(erp => { row[erp] = buildStatus(i, erp); });
  row._has_failed = ERP_LIST.some(erp => row[erp] === "FAILED");
  return row;
});

const StatusCell = ({ value }: { value: Status }) => {
  if (!value) return <span className="st-cell none" title="송신 대상 아님"><span className="st-icon">—</span></span>;
  const icon = value === "SUCCESS" ? "✓" : value === "FAILED" ? "✕" : value === "PENDING" ? "⏳" : "⟳";
  return <span className={`st-cell ${value.toLowerCase()}`} title={value}><span className="st-icon">{icon}</span></span>;
};

const ActionBadge = ({ value }: { value: string }) => <span className={`action-badge ${value}`}>{value}</span>;
const CodeChip = ({ value }: { value: string }) => <span className="code-chip">{value}</span>;

export function DistributionMonitorPage() {
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [actionF, setActionF] = useState("all");
  const [period, setPeriod] = useState("today");

  const columnDefs = useMemo<ColDef<ItemRow>[]>(() => ([
    { headerName: "품목코드", field: "code", width: 170, pinned: "left", cellRenderer: (p: ICellRendererParams<ItemRow>) => <CodeChip value={p.value} /> },
    { headerName: "품목명", field: "name", width: 200, pinned: "left", cellStyle: { fontWeight: 600 } as any },
    { headerName: "유형", field: "action", width: 80, cellRenderer: (p: ICellRendererParams<ItemRow>) => <ActionBadge value={p.value} />, cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any },
    ...ERP_LIST.map((erp): ColDef<ItemRow> => ({
      headerName: erp, field: erp, width: 70,
      cellRenderer: (p: ICellRendererParams<ItemRow>) => <StatusCell value={p.value as Status} />,
      cellStyle: { display: "flex", alignItems: "center", justifyContent: "center", padding: "0" } as any,
      filterValueGetter: (p) => (p.data?.[erp] as string) || "—",
      sortable: false,
    })),
    {
      headerName: "동작", width: 100, pinned: "right", sortable: false, filter: false,
      cellRenderer: (p: ICellRendererParams<ItemRow>) => p.data!._has_failed
        ? <div className="row-acts"><button className="ic-btn retry">🔁 재시도</button></div>
        : <div className="row-acts"><button className="ic-btn"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button></div>,
      cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any,
    },
  ]), []);

  const onGridReady = useCallback((e: GridReadyEvent) => {
    e.api.sizeColumnsToFit();
  }, []);

  // External filters
  const isExtPresent = useCallback(() => statusF !== "all" || actionF !== "all", [statusF, actionF]);
  const doesExtPass = useCallback((node: any) => {
    const okSt = statusF === "all" || ERP_LIST.some(erp => node.data[erp] === statusF);
    const okAc = actionF === "all" || node.data.action === actionF;
    return okSt && okAc;
  }, [statusF, actionF]);

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>ERP 배포현황<span className="text-xs text-gray-500 font-normal ml-2">/ distribution</span></h1>
          <div className="meta">erp_interface_items 모니터링 · INSERT / UPDATE / REVOKE · 실패 재시도</div>
        </div>
        <div className="actions">
          <button className="btn-sec">🔄 새로고침</button>
          <button className="btn-sec">⬇ 실패 목록 내보내기</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3" style={{ marginTop: 16 }}>
        <div className="stat-card"><div className="stat-icon total"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/></svg></div><div><div className="stat-val">1,847</div><div className="stat-label">전체 배포 (오늘 +124)</div></div></div>
        <div className="stat-card"><div className="stat-icon success"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg></div><div><div className="stat-val success-c">1,792</div><div className="stat-label">성공 (97.0%)</div></div></div>
        <div className="stat-card"><div className="stat-icon failed"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div><div><div className="stat-val failed-c">17</div><div className="stat-label">실패 (재배포 필요)</div></div></div>
        <div className="stat-card"><div className="stat-icon pending"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><div className="stat-val pending-c">38</div><div className="stat-label">대기 (PENDING + PROCESSING)</div></div></div>
      </div>

      <div className="callout-info">💡 erp-sync 미들웨어 1분 간격 폴링 · PENDING → MSSQL INSERT/UPDATE → SUCCESS / FAILED. 실패는 행에서 직접 재시도 가능.</div>

      <div className="dist-toolbar">
        <div className="search-box">
          <svg className="ic-search" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="품목코드 · 품목명 검색…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option value="all">상태: 전체</option><option value="SUCCESS">성공만</option><option value="FAILED">실패만</option><option value="PENDING">대기만</option>
        </select>
        <select value={actionF} onChange={(e) => setActionF(e.target.value)}>
          <option value="all">유형: 전체</option><option value="INSERT">INSERT</option><option value="UPDATE">UPDATE</option><option value="REVOKE">REVOKE</option>
        </select>
        <div className="seg">
          {["today", "7d", "30d"].map(p => (
            <button key={p} className={period === p ? "on" : ""} onClick={() => setPeriod(p)}>
              {p === "today" ? "오늘" : p === "7d" ? "최근 7일" : "최근 30일"}
            </button>
          ))}
        </div>
        <span style={{ flex: 1 }}></span>
        <button className="btn-sec">🔁 실패 전체 재시도 (17건)</button>
      </div>

      <div className="legend">
        <span style={{ fontWeight: 600 }}>범례:</span>
        <span className="lg-item"><span className="lg-icon success">✓</span> SUCCESS</span>
        <span className="lg-item"><span className="lg-icon failed">✕</span> FAILED</span>
        <span className="lg-item"><span className="lg-icon pending">⏳</span> PENDING</span>
        <span className="lg-item"><span className="lg-icon processing">⟳</span> PROCESSING</span>
        <span className="lg-item"><span className="lg-icon none">—</span> 송신 대상 아님</span>
      </div>

      <div className="ag-theme-quartz" style={{ height: 520 }}>
        <AgGridReact<ItemRow>
          rowData={ROWS}
          columnDefs={columnDefs}
          rowHeight={44} headerHeight={36}
          suppressCellFocus suppressMenuHide
          defaultColDef={{ sortable: true, resizable: true, filter: "agTextColumnFilter", menuTabs: ["filterMenuTab", "generalMenuTab"] }}
          pagination paginationPageSize={50} paginationPageSizeSelector={[25, 50, 100]}
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

.seg { display: inline-flex; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
.seg button { padding: 6px 12px; background: #fff; border: none; cursor: pointer; font-size: 13px; color: #475569; }
.seg button + button { border-left: 1px solid #cbd5e1; }
.seg button.on { background: #003876; color: #fff; font-weight: 600; }

.btn-sec { background: #fff; color: #003876; border: 1px solid #cbd5e1; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-sec:hover { background: #eff6ff; border-color: #003876; }

.code-chip { display: inline-block; padding: 1px 7px; border-radius: 4px; background: #f1f5f9; color: #003876; border: 1px solid #cbd5e1; font-family: ui-monospace, monospace; font-size: 12px; font-weight: 600; line-height: 1.5; }
.action-badge { display: inline-block; padding: 0 5px; border-radius: 4px; font-size: 10px; font-weight: 700; }
.action-badge.INSERT { background: #ecfdf5; color: #047857; border: 1px solid #bbf7d0; }
.action-badge.UPDATE { background: #dbeafe; color: #003876; border: 1px solid #bfdbfe; }
.action-badge.REVOKE { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

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
.row-acts .ic-btn:hover { background: #eff6ff; color: #003876; border-color: #003876; }
.row-acts svg { width: 12px; height: 12px; }

.legend { display: flex; align-items: center; gap: 14px; margin: 8px 0 4px 0; font-size: 12px; color: #64748b; }
.legend .lg-item { display: inline-flex; align-items: center; gap: 6px; }
.legend .lg-icon { width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; }
.legend .lg-icon.success { background: #ecfdf5; color: #047857; border: 1px solid #bbf7d0; }
.legend .lg-icon.failed { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.legend .lg-icon.pending { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.legend .lg-icon.processing { background: #dbeafe; color: #003876; border: 1px solid #bfdbfe; }
.legend .lg-icon.none { background: transparent; color: #cbd5e1; border: 1px dashed #e2e8f0; }
`;
