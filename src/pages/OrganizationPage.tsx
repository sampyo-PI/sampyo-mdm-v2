import { useCallback, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef, type GridApi, type GridReadyEvent, type ICellRendererParams } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

type SeriesCode = "SPI_GROUP" | "CEMENT_GROUP" | "NATURE_GROUP" | "PNC_GROUP" | null;
type Company = { code: string; name: string; series_code: SeriesCode; series_name: string | null; description: string; is_active: boolean };
type Site = { company: Company; code: string; name: string; description: string; is_active: boolean };
type Equipment = { company: Company; site: Site; code: string; name: string; description: string; is_active: boolean };

const COMPANIES: Company[] = [
  { code: "SPI", name: "삼표산업", series_code: "SPI_GROUP", series_name: "삼표산업 계열", description: "본사 — 골재/시멘트/레미콘 통합", is_active: true },
  { code: "NRC", name: "엔알씨", series_code: "SPI_GROUP", series_name: "삼표산업 계열", description: "삼표산업 계열사", is_active: true },
  { code: "TYC", name: "삼표시멘트", series_code: "CEMENT_GROUP", series_name: "시멘트 계열", description: "시멘트 제조", is_active: true },
  { code: "DAMUL", name: "자원개발", series_code: "CEMENT_GROUP", series_name: "시멘트 계열", description: "골재/모래 채취", is_active: true },
  { code: "SPRC", name: "삼표레미콘", series_code: "CEMENT_GROUP", series_name: "시멘트 계열", description: "레미콘", is_active: true },
  { code: "NDW", name: "에스피네이처", series_code: "NATURE_GROUP", series_name: "네이처 계열", description: "친환경 사업", is_active: true },
  { code: "HM", name: "홍명산업", series_code: "NATURE_GROUP", series_name: "네이처 계열", description: "네이처 계열사", is_active: true },
  { code: "SPENR", name: "에스피환경", series_code: "NATURE_GROUP", series_name: "네이처 계열", description: "환경 사업", is_active: true },
  { code: "SPRMC", name: "에스피레미콘", series_code: "NATURE_GROUP", series_name: "네이처 계열", description: "레미콘", is_active: true },
  { code: "SPENC", name: "P&C", series_code: "PNC_GROUP", series_name: "피앤씨 계열", description: "기계·플랜트", is_active: true },
  { code: "SPRAIL", name: "레일웨이", series_code: "PNC_GROUP", series_name: "피앤씨 계열", description: "철도 콘크리트 침목", is_active: true },
  { code: "SPE", name: "팬트랙", series_code: "PNC_GROUP", series_name: "피앤씨 계열", description: "전후궤도 침목", is_active: true },
  { code: "FTS", name: "에프티에스", series_code: null, series_name: null, description: "물류·운송 (계열 미지정)", is_active: true },
  { code: "CHAM", name: "청암", series_code: null, series_name: null, description: "조직 미정 — 비활성", is_active: false },
  { code: "SPSNA", name: "에스피에스엔에이", series_code: null, series_name: null, description: "신규 합병 예정 — 비활성", is_active: false },
];

const SITE_NAMES = ["서울본사", "성수공장", "사천공장", "안동공장", "동해1공장", "동해2공장", "동해광산", "원주공장", "광양공장", "여수공장", "포천공장", "춘천공장"];
const SITES: Site[] = (() => {
  const out: Site[] = [];
  let id = 1;
  COMPANIES.forEach(co => {
    if (!co.is_active) return;
    const n = 8 + (id % 12);
    for (let i = 0; i < n && id <= 246; i++) {
      out.push({
        company: co,
        code: `${co.code}-${String(id).padStart(3, "0")}`,
        name: SITE_NAMES[i % SITE_NAMES.length] + (i >= SITE_NAMES.length ? ` #${i}` : ""),
        description: `${co.name} ${SITE_NAMES[i % SITE_NAMES.length]}`,
        is_active: (id % 14) !== 0,
      });
      id++;
    }
  });
  return out;
})();

const EQ_NAMES = ["크러셔 1호", "스크린 2호", "벨트컨베이어 #3", "분쇄기 A", "선별기 B", "포장기", "유압프레스", "시멘트밀", "출하호퍼", "Bag Filter"];
const EQUIPMENTS: Equipment[] = (() => {
  const out: Equipment[] = [];
  let id = 1;
  SITES.slice(0, 80).forEach(s => {
    const n = 3 + (id % 8);
    for (let i = 0; i < n && id <= 200; i++) {
      out.push({
        company: s.company,
        site: s,
        code: `EQ${String(id).padStart(5, "0")}`,
        name: EQ_NAMES[i % EQ_NAMES.length],
        description: `${s.name} ${EQ_NAMES[i % EQ_NAMES.length]}`,
        is_active: (id % 13) !== 0,
      });
      id++;
    }
  });
  return out;
})();

const CodeChip = ({ value }: { value: string }) => <span className="code-chip">{value}</span>;
const StatusBadge = ({ on }: { on: boolean }) => (
  <span className={`badge-status ${on ? "active" : "inactive"}`}>{on ? "활성" : "비활성"}</span>
);
const SeriesChip = ({ company }: { company: Company }) => {
  if (!company.series_code) return <span className="series-chip none">미지정</span>;
  const cls = company.series_code === "CEMENT_GROUP" ? "cement" : company.series_code === "SPI_GROUP" ? "spi" : company.series_code === "PNC_GROUP" ? "pnc" : "nature";
  return <span className={`series-chip ${cls}`}>{company.series_name}</span>;
};
const CompanyChip = ({ value }: { value: Company | null }) => {
  if (!value) return null;
  return (
    <span className="company-chip">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>
      {value.name} ({value.code})
    </span>
  );
};
const SiteChip = ({ value }: { value: Site | null }) => {
  if (!value) return null;
  return (
    <span className="company-chip">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      {value.name}
    </span>
  );
};
const DescCell = ({ value }: { value: string | null }) => value ? <span style={{ color: "#64748b", fontSize: 13 }}>{value}</span> : <span style={{ color: "#cbd5e1" }}>—</span>;
const ActionsCell = () => (
  <div className="row-acts">
    <button className="ic-btn"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
    <button className="ic-btn del"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
  </div>
);

type Tab = "companies" | "sites" | "equipments";

export function OrganizationPage() {
  const [tab, setTab] = useState<Tab>("companies");
  const [qCo, setQCo] = useState("");
  const [qSite, setQSite] = useState("");
  const [qEq, setQEq] = useState("");
  const apis = useRef<Record<string, GridApi | null>>({ companies: null, sites: null, equipments: null });

  const onReady = useCallback((key: string) => (e: GridReadyEvent) => {
    apis.current[key] = e.api;
    e.api.sizeColumnsToFit();
  }, []);

  const baseGrid = {
    rowHeight: 48, headerHeight: 36,
    suppressCellFocus: true, suppressMenuHide: true,
    defaultColDef: {
      sortable: true, resizable: true,
      filter: "agTextColumnFilter" as const,
      menuTabs: ["filterMenuTab", "generalMenuTab"] as ["filterMenuTab", "generalMenuTab"],
    },
    pagination: true, paginationPageSize: 50, paginationPageSizeSelector: [25, 50, 100],
  };

  const companyCols = useMemo<ColDef<Company>[]>(() => ([
    { headerName: "계열", field: "series_code", width: 130, cellRenderer: (p: ICellRendererParams<Company>) => <SeriesChip company={p.data!} />, filterValueGetter: (p) => p.data?.series_name || "미지정" },
    { headerName: "코드", field: "code", width: 100, cellRenderer: (p: ICellRendererParams<Company>) => <CodeChip value={p.value} /> },
    { headerName: "법인명", field: "name", width: 170, cellStyle: { fontWeight: 600 } as any },
    { headerName: "설명", field: "description", width: 260, cellRenderer: (p: ICellRendererParams<Company>) => <DescCell value={p.value} /> },
    { headerName: "상태", field: "is_active", width: 90, cellRenderer: (p: ICellRendererParams<Company>) => <StatusBadge on={p.value} />, filterValueGetter: (p) => p.data?.is_active ? "활성" : "비활성" },
    { headerName: "관리", width: 100, cellRenderer: () => <ActionsCell />, sortable: false, filter: false, cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any },
  ]), []);
  const siteCols = useMemo<ColDef<Site>[]>(() => ([
    { headerName: "법인", field: "company", width: 180, cellRenderer: (p: ICellRendererParams<Site>) => <CompanyChip value={p.value} />, filterValueGetter: (p) => p.data?.company ? `${p.data.company.name} (${p.data.company.code})` : "" },
    { headerName: "코드", field: "code", width: 130, cellRenderer: (p: ICellRendererParams<Site>) => <CodeChip value={p.value} /> },
    { headerName: "사업장명", field: "name", width: 180, cellStyle: { fontWeight: 600 } as any },
    { headerName: "설명", field: "description", width: 240, cellRenderer: (p: ICellRendererParams<Site>) => <DescCell value={p.value} /> },
    { headerName: "상태", field: "is_active", width: 90, cellRenderer: (p: ICellRendererParams<Site>) => <StatusBadge on={p.value} />, filterValueGetter: (p) => p.data?.is_active ? "활성" : "비활성" },
    { headerName: "관리", width: 100, cellRenderer: () => <ActionsCell />, sortable: false, filter: false, cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any },
  ]), []);
  const eqCols = useMemo<ColDef<Equipment>[]>(() => ([
    { headerName: "법인", field: "company", width: 160, cellRenderer: (p: ICellRendererParams<Equipment>) => <CompanyChip value={p.value} />, filterValueGetter: (p) => p.data?.company ? `${p.data.company.name} (${p.data.company.code})` : "" },
    { headerName: "사업장", field: "site", width: 150, cellRenderer: (p: ICellRendererParams<Equipment>) => <SiteChip value={p.value} />, filterValueGetter: (p) => p.data?.site ? p.data.site.name : "" },
    { headerName: "코드", field: "code", width: 110, cellRenderer: (p: ICellRendererParams<Equipment>) => <CodeChip value={p.value} /> },
    { headerName: "설비명", field: "name", width: 180, cellStyle: { fontWeight: 600 } as any },
    { headerName: "설명", field: "description", width: 220, cellRenderer: (p: ICellRendererParams<Equipment>) => <DescCell value={p.value} /> },
    { headerName: "상태", field: "is_active", width: 90, cellRenderer: (p: ICellRendererParams<Equipment>) => <StatusBadge on={p.value} />, filterValueGetter: (p) => p.data?.is_active ? "활성" : "비활성" },
    { headerName: "관리", width: 100, cellRenderer: () => <ActionsCell />, sortable: false, filter: false, cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any },
  ]), []);

  const switchTab = (t: Tab) => {
    setTab(t);
    setTimeout(() => Object.values(apis.current).forEach(api => api?.sizeColumnsToFit()), 0);
  };

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>조직관리<span className="text-xs text-gray-500 font-normal ml-2">/ admin/organization</span></h1>
          <div className="meta">법인 · 사업장 · 설비 마스터 관리 (ERP B_BIZ_AREA / B_EQUIPMENT 동기화)</div>
        </div>
        <div className="actions">
          <button className="btn-sec">⬇ 마스터 내보내기</button>
          <button className="btn-sec">🔄 ERP 동기화</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3" style={{ marginTop: 16 }}>
        <div className="stat-card">
          <div className="stat-icon co">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>
          </div>
          <div>
            <div className="stat-val">{COMPANIES.length}</div>
            <div className="stat-label">법인 (활성 {COMPANIES.filter(c => c.is_active).length} · 4 계열)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon site">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          </div>
          <div>
            <div className="stat-val">{SITES.length}</div>
            <div className="stat-label">사업장 (B_BIZ_AREA 시드)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon eq">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div>
            <div className="stat-val">{EQUIPMENTS.length.toLocaleString()}</div>
            <div className="stat-label">설비 (B_EQUIPMENT 시드)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon inactive">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </div>
          <div>
            <div className="stat-val">{COMPANIES.filter(c=>!c.is_active).length + SITES.filter(s=>!s.is_active).length + EQUIPMENTS.filter(e=>!e.is_active).length}</div>
            <div className="stat-label">비활성 (법인/사업장/설비 합)</div>
          </div>
        </div>
      </div>

      <div className="callout-info">
        💡 법인/사업장은 ERP <strong>B_BIZ_AREA</strong>에서 시드됩니다. 설비는 <strong>B_EQUIPMENT</strong> 동기화. 비활성 항목은 신청 시 콤보박스에 안 나옴.
      </div>

      <div className="tabs">
        <button className={tab === "companies" ? "on" : ""} onClick={() => switchTab("companies")}>법인 <span className="ct">{COMPANIES.length}</span></button>
        <button className={tab === "sites" ? "on" : ""} onClick={() => switchTab("sites")}>사업장 <span className="ct">{SITES.length}</span></button>
        <button className={tab === "equipments" ? "on" : ""} onClick={() => switchTab("equipments")}>설비 <span className="ct">{EQUIPMENTS.length.toLocaleString()}</span></button>
      </div>

      {tab === "companies" && (
        <>
          <div className="org-toolbar">
            <div className="search-box">
              <svg className="ic-search" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="법인명 · 코드 검색…" value={qCo} onChange={(e) => setQCo(e.target.value)} />
            </div>
            <span className="t-meta">전체 <strong className="t-navy">{COMPANIES.length}개</strong></span>
            <span style={{ flex: 1 }}></span>
            <button className="btn-primary">+ 법인 추가</button>
          </div>
          <div className="ag-theme-quartz" style={{ height: 480 }}>
            <AgGridReact<Company> rowData={COMPANIES} columnDefs={companyCols} quickFilterText={qCo} onGridReady={onReady("companies")} {...baseGrid} />
          </div>
        </>
      )}

      {tab === "sites" && (
        <>
          <div className="org-toolbar">
            <div className="search-box">
              <svg className="ic-search" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="사업장명 · 코드 검색…" value={qSite} onChange={(e) => setQSite(e.target.value)} />
            </div>
            <span className="t-meta">전체 <strong className="t-navy">{SITES.length}개</strong></span>
            <span style={{ flex: 1 }}></span>
            <button className="btn-primary">+ 사업장 추가</button>
          </div>
          <div className="ag-theme-quartz" style={{ height: 480 }}>
            <AgGridReact<Site> rowData={SITES} columnDefs={siteCols} quickFilterText={qSite} onGridReady={onReady("sites")} {...baseGrid} />
          </div>
        </>
      )}

      {tab === "equipments" && (
        <>
          <div className="org-toolbar">
            <div className="search-box">
              <svg className="ic-search" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="설비명 · 코드 · 법인 검색…" value={qEq} onChange={(e) => setQEq(e.target.value)} />
            </div>
            <span className="t-meta">전체 <strong className="t-navy">{EQUIPMENTS.length.toLocaleString()}개</strong></span>
            <span style={{ flex: 1 }}></span>
            <button className="btn-primary">+ 설비 추가</button>
          </div>
          <div className="ag-theme-quartz" style={{ height: 480 }}>
            <AgGridReact<Equipment> rowData={EQUIPMENTS} columnDefs={eqCols} quickFilterText={qEq} onGridReady={onReady("equipments")} {...baseGrid} />
          </div>
        </>
      )}
    </section>
  );
}

const PAGE_STYLES = `
.stat-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; display: flex; align-items: center; gap: 14px; }
.stat-card .stat-icon { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 8px; }
.stat-card .stat-icon.co { background: #eff6ff; color: #003876; }
.stat-card .stat-icon.site { background: #f5f3ff; color: #6d28d9; }
.stat-card .stat-icon.eq { background: #ecfdf5; color: #047857; }
.stat-card .stat-icon.inactive { background: #fef2f2; color: #b91c1c; }
.stat-card .stat-icon svg { width: 20px; height: 20px; }
.stat-card .stat-val { font-size: 22px; font-weight: 700; color: #003876; line-height: 1.1; }
.stat-card .stat-label { font-size: 12px; color: #64748b; margin-top: 2px; }

.callout-info { background: #eff6ff; border-left: 3px solid #003876; padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #1e293b; margin-top: 16px; }

.tabs { display: inline-flex; background: #f1f5f9; border-radius: 8px; padding: 4px; margin: 18px 0 14px 0; }
.tabs button { padding: 8px 18px; border: none; background: transparent; cursor: pointer; font-size: 14px; font-weight: 500; color: #64748b; border-radius: 6px; transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px; }
.tabs button.on { background: #fff; color: #003876; font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.tabs button .ct { font-size: 11px; color: #94a3b8; font-weight: 500; }
.tabs button.on .ct { color: #64748b; }

.org-toolbar { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 12px; }
.org-toolbar .search-box { position: relative; flex: 1; max-width: 380px; }
.org-toolbar .search-box input { width: 100%; padding: 8px 12px 8px 34px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: #1f2937; }
.org-toolbar .search-box input:focus { outline: none; border-color: #003876; box-shadow: 0 0 0 2px rgba(0,56,118,0.1); }
.org-toolbar .search-box .ic-search { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #94a3b8; }

.btn-primary { background: #003876; color: #fff; border: 1px solid #003876; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.btn-primary:hover { background: #002a5c; }
.btn-sec { background: #fff; color: #003876; border: 1px solid #cbd5e1; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.btn-sec:hover { background: #eff6ff; border-color: #003876; }

.code-chip { display: inline-block; padding: 1px 7px; border-radius: 4px; background: #f1f5f9; color: #003876; border: 1px solid #cbd5e1; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; font-weight: 600; line-height: 1.5; }
.company-chip { display: inline-flex; align-items: center; gap: 4px; background: #f8fafc; color: #1f2937; border: 1px solid #e2e8f0; border-radius: 4px; padding: 1px 8px; font-size: 13px; line-height: 1.5; }
.company-chip svg { width: 11px; height: 11px; color: #64748b; }
.badge-status { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 600; line-height: 1.5; }
.badge-status.active { background: #ecfdf5; color: #047857; border: 1px solid #bbf7d0; }
.badge-status.inactive { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }

.series-chip { display: inline-block; padding: 1px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; line-height: 1.5; }
.series-chip.cement { background: #eff6ff; color: #003876; border: 1px solid #bfdbfe; }
.series-chip.spi { background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; }
.series-chip.pnc { background: #ecfdf5; color: #047857; border: 1px solid #bbf7d0; }
.series-chip.nature { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.series-chip.none { background: #f1f5f9; color: #94a3b8; border: 1px solid #e2e8f0; }

.row-acts { display: flex; gap: 4px; justify-content: center; }
.row-acts .ic-btn { width: 28px; height: 28px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; border-radius: 6px; color: #475569; display: inline-flex; align-items: center; justify-content: center; }
.row-acts .ic-btn:hover { background: #eff6ff; color: #003876; border-color: #003876; }
.row-acts .ic-btn.del:hover { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
.row-acts svg { width: 14px; height: 14px; }

.t-meta { font-size: 13px; font-weight: 500; color: #64748b; }
.t-navy { color: #003876 !important; }
`;
