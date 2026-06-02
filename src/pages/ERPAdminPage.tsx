import { useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef, type GridApi, type GridReadyEvent, type ICellRendererParams } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

type ERP = { code: string; name: string; description: string; is_active: boolean };
type Mapping = { cat_code: string; cat_name: string; account_code: string | null; account_name: string | null };

const ERP_SYSTEMS: ERP[] = [
  { code: "SPI", name: "삼표산업", description: "삼표산업 ERP — 본사", is_active: true },
  { code: "NRC", name: "엔알씨", description: "엔알씨 ERP", is_active: true },
  { code: "TYC", name: "삼표시멘트", description: "삼표시멘트 ERP", is_active: true },
  { code: "DAMUL", name: "자원개발", description: "자원개발 ERP", is_active: true },
  { code: "SPRC", name: "삼표레미콘", description: "삼표레미콘 ERP", is_active: true },
  { code: "NDW", name: "에스피네이처", description: "에스피네이처 ERP", is_active: true },
  { code: "HM", name: "홍명산업", description: "홍명산업 ERP", is_active: true },
  { code: "SPENR", name: "에스피환경", description: "에스피환경 ERP", is_active: true },
  { code: "SPRMC", name: "에스피레미콘", description: "에스피레미콘 ERP", is_active: true },
  { code: "SPENC", name: "P&C", description: "P&C ERP", is_active: true },
  { code: "SPRAIL", name: "레일웨이", description: "레일웨이 ERP", is_active: true },
  { code: "SPE", name: "팬트랙", description: "팬트랙 ERP", is_active: true },
  { code: "FTS", name: "에프티에스", description: "에프티에스 ERP — 송신 미활성", is_active: false },
  { code: "CHAM", name: "청암", description: "청암 ERP — 비활성", is_active: false },
  { code: "SPSNA", name: "에스피에스엔에이", description: "에스피에스엔에이 ERP — 비활성", is_active: false },
];

const COMPANY_STATS: Record<string, { mapped: number; unmapped: number }> = {
  SPI: { mapped: 593, unmapped: 59 }, NRC: { mapped: 521, unmapped: 131 },
  TYC: { mapped: 624, unmapped: 28 }, DAMUL: { mapped: 580, unmapped: 72 },
  SPRC: { mapped: 612, unmapped: 40 }, NDW: { mapped: 547, unmapped: 105 },
  HM: { mapped: 489, unmapped: 163 }, SPENR: { mapped: 510, unmapped: 142 },
  SPRMC: { mapped: 540, unmapped: 112 }, SPENC: { mapped: 631, unmapped: 21 },
  SPRAIL: { mapped: 415, unmapped: 237 }, SPE: { mapped: 370, unmapped: 282 },
};

const SAMPLE_CATEGORIES = [
  { code: "MLN", name: "라인", account: "12110", account_name: "원재료" },
  { code: "MLB", name: "베어링", account: "12120", account_name: "부품" },
  { code: "MLM", name: "모터", account: "12120", account_name: "부품" },
  { code: "MFP", name: "유압펌프", account: "12130", account_name: "기계장치" },
  { code: "MCF", name: "공기필터", account: "12140", account_name: "소모품" },
  { code: "MCV", name: "콘베이어벨트", account: "12130", account_name: "기계장치" },
  { code: "MCG", name: "기어드모터", account: "12120", account_name: "부품" },
  { code: "MCC", name: "체인", account: "12140", account_name: "소모품" },
  { code: "MSL", name: "실린더", account: "12130", account_name: "기계장치" },
  { code: "MSP", name: "스프링", account: "12140", account_name: "소모품" },
  { code: "MGR", name: "그리스", account: null, account_name: null },
  { code: "MOH", name: "유류", account: null, account_name: null },
  { code: "EBL", name: "전선", account: "12150", account_name: "전기자재" },
  { code: "EFU", name: "퓨즈", account: "12150", account_name: "전기자재" },
  { code: "EPS", name: "전원공급장치", account: null, account_name: null },
  { code: "PPL", name: "PLC", account: "12160", account_name: "제어기기" },
  { code: "PPS", name: "센서", account: "12160", account_name: "제어기기" },
  { code: "BSC", name: "스크류", account: "12170", account_name: "체결구" },
  { code: "BNT", name: "너트", account: "12170", account_name: "체결구" },
  { code: "BBL", name: "볼트", account: "12170", account_name: "체결구" },
];
function buildMappingRows(): Mapping[] {
  return Array.from({ length: 25 }, (_, i) => {
    const base = SAMPLE_CATEGORIES[i % SAMPLE_CATEGORIES.length];
    const cat_code = base.code + (Math.floor(i / SAMPLE_CATEGORIES.length) > 0 ? Math.floor(i / SAMPLE_CATEGORIES.length) : "");
    const unmapped = i % 8 === 7;
    return {
      cat_code,
      cat_name: base.name,
      account_code: unmapped ? null : base.account,
      account_name: unmapped ? null : base.account_name,
    };
  });
}

const CodeChip = ({ value }: { value: string | null }) => value ? <span className="code-chip">{value}</span> : null;
const ToggleStatus = ({ on }: { on: boolean }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div className={`toggle ${on ? "on" : ""}`}><div className="sw"></div></div>
    <span className={`badge-status ${on ? "active" : "inactive"}`}>{on ? "활성" : "비활성"}</span>
  </div>
);
const DescCell = ({ value }: { value: string | null }) => value ? <span style={{ color: "#64748b", fontSize: 13 }}>{value}</span> : <span style={{ color: "#cbd5e1" }}>—</span>;
const AccountCell = ({ data }: { data: Mapping }) => {
  if (!data.account_code) {
    return (
      <span className="unmapped-warn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
        미매핑
      </span>
    );
  }
  return (
    <span className="account-cell">
      <span className="code-chip">{data.account_code}</span>
      <span className="ac-name">{data.account_name}</span>
    </span>
  );
};
const ActionsCell = () => (
  <div className="row-acts">
    <button className="ic-btn"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
  </div>
);

type Tab = "systems" | "mapping";

export function ERPAdminPage() {
  const [tab, setTab] = useState<Tab>("systems");
  const [selectedCo, setSelectedCo] = useState("SPI");
  const [qSys, setQSys] = useState("");
  const [qMap, setQMap] = useState("");
  const apis = useRef<{ systems: GridApi | null; mapping: GridApi | null }>({ systems: null, mapping: null });

  const onReady = (k: "systems" | "mapping") => (e: GridReadyEvent) => {
    apis.current[k] = e.api;
    e.api.sizeColumnsToFit();
  };

  const baseGrid = {
    rowHeight: 48, headerHeight: 36,
    suppressCellFocus: true, suppressMenuHide: true,
    defaultColDef: { sortable: true, resizable: true, filter: "agTextColumnFilter" as const, menuTabs: ["filterMenuTab", "generalMenuTab"] as ["filterMenuTab", "generalMenuTab"] },
    pagination: true, paginationPageSize: 50, paginationPageSizeSelector: [25, 50, 100],
  };

  const sysCols = useMemo<ColDef<ERP>[]>(() => ([
    { headerName: "코드", field: "code", width: 100, cellRenderer: (p: ICellRendererParams<ERP>) => <CodeChip value={p.value} /> },
    { headerName: "이름", field: "name", width: 180, cellStyle: { fontWeight: 600 } as any },
    { headerName: "설명", field: "description", width: 280, cellRenderer: (p: ICellRendererParams<ERP>) => <DescCell value={p.value} /> },
    { headerName: "상태", field: "is_active", width: 140, cellRenderer: (p: ICellRendererParams<ERP>) => <ToggleStatus on={p.value} />, filterValueGetter: (p) => p.data?.is_active ? "활성" : "비활성" },
    { headerName: "관리", width: 100, cellRenderer: () => <ActionsCell />, sortable: false, filter: false, cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any },
  ]), []);

  const mappingCols = useMemo<ColDef<Mapping>[]>(() => ([
    { headerName: "소분류 코드", field: "cat_code", width: 100, cellRenderer: (p: ICellRendererParams<Mapping>) => <CodeChip value={p.value} /> },
    { headerName: "소분류명", field: "cat_name", width: 200, cellStyle: { fontWeight: 600 } as any },
    { headerName: "품목계정 매핑", field: "account_code", width: 280, cellRenderer: (p: ICellRendererParams<Mapping>) => <AccountCell data={p.data!} />, filterValueGetter: (p) => p.data?.account_code ? `${p.data.account_code} ${p.data.account_name}` : "미매핑" },
    { headerName: "편집", width: 80, cellRenderer: () => <ActionsCell />, sortable: false, filter: false, cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any },
  ]), []);

  const mappingRows = useMemo(() => buildMappingRows(), []);
  const switchTab = (t: Tab) => {
    setTab(t);
    setTimeout(() => apis.current[t]?.sizeColumnsToFit(), 0);
  };

  const stat = COMPANY_STATS[selectedCo] || { mapped: 0, unmapped: 0 };

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>배포 ERP 관리<span className="text-xs text-gray-500 font-normal ml-2">/ admin/erp</span></h1>
          <div className="meta">배포 대상 ERP 시스템 + 법인별 품목계정 매핑 (IF_B_ITEM 송신 기준)</div>
        </div>
        <div className="actions">
          <button className="btn-sec">⬇ 매핑 내보내기</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3" style={{ marginTop: 16 }}>
        <div className="stat-card">
          <div className="stat-icon erp"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/></svg></div>
          <div><div className="stat-val">15 <small>/ 15</small></div><div className="stat-label">ERP 시스템</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg></div>
          <div><div className="stat-val">12</div><div className="stat-label">송신 활성 (CHAM/SPSNA/FTS 제외)</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon mapping"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h16M4 6h16M4 18h12"/></svg></div>
          <div><div className="stat-val">8,432 <small>/ 9,128</small></div><div className="stat-label">계정 매핑</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon unmapped"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg></div>
          <div><div className="stat-val">696</div><div className="stat-label">미매핑 (송신 시 fallback 또는 NULL)</div></div>
        </div>
      </div>

      <div className="callout-info">💡 <strong>target_erp_systems</strong> 활성 회사로만 IF_B_ITEM 송신. 소분류별 미매핑은 <strong>erp_company_category_defaults</strong>에서 기본값 lookup, 없으면 NULL.</div>

      <div className="tabs">
        <button className={tab === "systems" ? "on" : ""} onClick={() => switchTab("systems")}>ERP 시스템 <span className="ct">15</span></button>
        <button className={tab === "mapping" ? "on" : ""} onClick={() => switchTab("mapping")}>법인별 계정 매핑 <span className="ct">9,128</span></button>
      </div>

      {tab === "systems" && (
        <>
          <div className="erp-toolbar">
            <div className="search-box">
              <svg className="ic-search" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="ERP 코드 · 이름 검색…" value={qSys} onChange={(e) => setQSys(e.target.value)} />
            </div>
            <span className="t-meta">전체 <strong className="t-navy">15개</strong></span>
            <span style={{ flex: 1 }}></span>
            <button className="btn-primary">+ ERP 추가</button>
          </div>
          <div className="ag-theme-quartz" style={{ height: 480 }}>
            <AgGridReact<ERP> rowData={ERP_SYSTEMS} columnDefs={sysCols} quickFilterText={qSys} onGridReady={onReady("systems")} {...baseGrid} />
          </div>
        </>
      )}

      {tab === "mapping" && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>📍 회사 선택 (소분류별 계정 매핑 보기)</div>
          <div className="co-grid">
            {ERP_SYSTEMS.filter(e => e.is_active).map(e => {
              const s = COMPANY_STATS[e.code] || { mapped: 0, unmapped: 0 };
              const pct = Math.round((s.mapped / 652) * 100);
              return (
                <button key={e.code} className={`co-btn ${e.code === selectedCo ? "on" : ""}`} onClick={() => setSelectedCo(e.code)}>
                  <div className="co-name">{e.name}</div>
                  <div className="co-meta">{e.code} · {pct}%</div>
                  {s.unmapped > 50 && <div className="co-warn">⚠ 미매핑 {s.unmapped}</div>}
                </button>
              );
            })}
          </div>

          <div className="erp-toolbar">
            <div className="search-box">
              <svg className="ic-search" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="소분류명 · 코드 검색…" value={qMap} onChange={(e) => setQMap(e.target.value)} />
            </div>
            <select><option value="all">전체 표시</option><option value="unmapped">미매핑만</option><option value="mapped">매핑됨만</option></select>
            <span className="t-meta">{selectedCo}: 매핑 {stat.mapped} / 미매핑 <span style={{ color: "#b45309", fontWeight: 700 }}>{stat.unmapped}</span></span>
            <span style={{ flex: 1 }}></span>
            <button className="btn-sec">📥 일괄 매핑 (CSV)</button>
          </div>
          <div className="ag-theme-quartz" style={{ height: 460 }}>
            <AgGridReact<Mapping> rowData={mappingRows} columnDefs={mappingCols} quickFilterText={qMap} onGridReady={onReady("mapping")} {...baseGrid} />
          </div>
        </>
      )}
    </section>
  );
}

const PAGE_STYLES = `
.stat-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; display: flex; align-items: center; gap: 14px; }
.stat-card .stat-icon { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 8px; }
.stat-card .stat-icon.erp { background: #eff6ff; color: #003876; }
.stat-card .stat-icon.active { background: #ecfdf5; color: #047857; }
.stat-card .stat-icon.mapping { background: #f5f3ff; color: #6d28d9; }
.stat-card .stat-icon.unmapped { background: #fef3c7; color: #92400e; }
.stat-card .stat-icon svg { width: 20px; height: 20px; }
.stat-card .stat-val { font-size: 22px; font-weight: 700; color: #003876; line-height: 1.1; }
.stat-card .stat-val small { font-size: 13px; font-weight: 500; color: #94a3b8; }
.stat-card .stat-label { font-size: 12px; color: #64748b; margin-top: 2px; }

.callout-info { background: #eff6ff; border-left: 3px solid #003876; padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #1e293b; margin-top: 16px; }

.tabs { display: inline-flex; background: #f1f5f9; border-radius: 8px; padding: 4px; margin: 18px 0 14px 0; }
.tabs button { padding: 8px 18px; border: none; background: transparent; cursor: pointer; font-size: 14px; font-weight: 500; color: #64748b; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; }
.tabs button.on { background: #fff; color: #003876; font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.tabs button .ct { font-size: 11px; color: #94a3b8; font-weight: 500; }
.tabs button.on .ct { color: #64748b; }

.erp-toolbar { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 12px; }
.erp-toolbar .search-box { position: relative; flex: 1; max-width: 380px; }
.erp-toolbar .search-box input { width: 100%; padding: 8px 12px 8px 34px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: #1f2937; }
.erp-toolbar .search-box .ic-search { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #94a3b8; }
.erp-toolbar select { padding: 7px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #475569; background: #fff; }

.btn-primary { background: #003876; color: #fff; border: 1px solid #003876; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-primary:hover { background: #002a5c; }
.btn-sec { background: #fff; color: #003876; border: 1px solid #cbd5e1; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-sec:hover { background: #eff6ff; border-color: #003876; }

.co-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 16px; }
.co-btn { background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; cursor: pointer; text-align: left; }
.co-btn:hover { border-color: #003876; background: #eff6ff; }
.co-btn.on { background: #003876; color: #fff; border-color: #003876; }
.co-btn .co-name { font-size: 13px; font-weight: 600; line-height: 1.2; }
.co-btn .co-meta { font-size: 11px; color: #94a3b8; margin-top: 2px; font-family: ui-monospace, monospace; }
.co-btn.on .co-meta { color: #bfdbfe; }
.co-btn .co-warn { color: #b45309; font-size: 11px; margin-top: 3px; font-weight: 600; }
.co-btn.on .co-warn { color: #fcd34d; }

.code-chip { display: inline-block; padding: 1px 7px; border-radius: 4px; background: #f1f5f9; color: #003876; border: 1px solid #cbd5e1; font-family: ui-monospace, monospace; font-size: 12px; font-weight: 600; line-height: 1.5; }
.badge-status { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 600; line-height: 1.5; }
.badge-status.active { background: #ecfdf5; color: #047857; border: 1px solid #bbf7d0; }
.badge-status.inactive { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }
.account-cell { display: inline-flex; align-items: center; gap: 6px; }
.account-cell .ac-name { color: #64748b; font-size: 12px; }
.unmapped-warn { display: inline-flex; align-items: center; gap: 4px; color: #b45309; font-size: 12px; font-weight: 600; }
.unmapped-warn svg { width: 12px; height: 12px; }

.toggle { display: inline-flex; align-items: center; gap: 6px; }
.toggle .sw { width: 32px; height: 18px; border-radius: 999px; background: #cbd5e1; position: relative; cursor: pointer; }
.toggle .sw::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: left 0.15s; }
.toggle.on .sw { background: #047857; }
.toggle.on .sw::after { left: 16px; }

.row-acts { display: flex; gap: 4px; justify-content: center; }
.row-acts .ic-btn { width: 28px; height: 28px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; border-radius: 6px; color: #475569; display: inline-flex; align-items: center; justify-content: center; }
.row-acts .ic-btn:hover { background: #eff6ff; color: #003876; border-color: #003876; }
.row-acts svg { width: 14px; height: 14px; }

.t-meta { font-size: 13px; font-weight: 500; color: #64748b; }
.t-navy { color: #003876 !important; }
`;
