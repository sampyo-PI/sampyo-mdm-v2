import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef, type GridApi, type GridReadyEvent, type ICellRendererParams } from "ag-grid-community";
import { rest } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { GridPager } from "../components/common/GridPager";

ModuleRegistry.registerModules([AllCommunityModule]);

type Company = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
};
type Site = {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  company: { id: string; code: string; name: string } | null;
};
type Equipment = {
  id: string;
  site_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  site: { id: string; code: string; name: string } | null;
  company: { id: string; code: string; name: string } | null;
};

// ── 데이터 fetch ──────────────────────────────────────────────
async function fetchCompanies(): Promise<Company[]> {
  return rest<Company[]>("GET", "companies", {
    params: { select: "id,code,name,description,is_active", order: "name.asc", limit: "500" },
  });
}
async function fetchSites(): Promise<Site[]> {
  // 246행 → PostgREST 기본 1000 제한 안전선 위해 limit 명시
  return rest<Site[]>("GET", "sites", {
    params: {
      select: "id,company_id,code,name,description,is_active,company:companies(id,code,name)",
      order: "name.asc",
      limit: "2000",
    },
  });
}
async function fetchEquipments(): Promise<Equipment[]> {
  return rest<Equipment[]>("GET", "equipments", {
    params: {
      select:
        "id,site_id,code,name,description,is_active,site:sites(id,code,name),company:companies(id,code,name)",
      order: "name.asc",
      limit: "2000",
    },
  });
}

// ── 셀 렌더러 ────────────────────────────────────────────────
const CodeChip = ({ value }: { value: string }) => <span className="code-chip">{value}</span>;
const StatusBadge = ({ on }: { on: boolean }) => (
  <span className={`badge-status ${on ? "active" : "inactive"}`}>{on ? "활성" : "비활성"}</span>
);
const CompanyChip = ({ value }: { value: { code: string; name: string } | null }) => {
  if (!value) return <span style={{ color: "#cbd5e1" }}>—</span>;
  return (
    <span className="company-chip">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>
      {value.name} ({value.code})
    </span>
  );
};
const SiteChip = ({ value }: { value: { name: string } | null }) => {
  if (!value) return <span style={{ color: "#cbd5e1" }}>—</span>;
  return (
    <span className="company-chip">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      {value.name}
    </span>
  );
};
const DescCell = ({ value }: { value: string | null }) => value ? <span style={{ color: "#64748b", fontSize: 13 }}>{value}</span> : <span style={{ color: "#cbd5e1" }}>—</span>;

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);

type Tab = "companies" | "sites" | "equipments";

// ── form 다이얼로그 타입 ──────────────────────────────────────
type CompanyForm = { code: string; name: string; description: string; is_active: boolean };
type SiteForm = { company_id: string; code: string; name: string; description: string; is_active: boolean };
type EquipmentForm = { site_id: string; code: string; name: string; description: string; is_active: boolean };

const EMPTY_COMPANY: CompanyForm = { code: "", name: "", description: "", is_active: true };
const EMPTY_SITE: SiteForm = { company_id: "", code: "", name: "", description: "", is_active: true };
const EMPTY_EQUIPMENT: EquipmentForm = { site_id: "", code: "", name: "", description: "", is_active: true };

export function OrganizationPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>("companies");
  const [qCo, setQCo] = useState("");
  const [qSite, setQSite] = useState("");
  const [qEq, setQEq] = useState("");
  const apis = useRef<Record<string, GridApi | null>>({ companies: null, sites: null, equipments: null });
  const [coApi, setCoApi] = useState<GridApi | null>(null);
  const [siteApi, setSiteApi] = useState<GridApi | null>(null);
  const [eqApi, setEqApi] = useState<GridApi | null>(null);

  // ── 다이얼로그 상태 ──
  const [coDlg, setCoDlg] = useState(false);
  const [coEdit, setCoEdit] = useState<Company | null>(null);
  const [coForm, setCoForm] = useState<CompanyForm>(EMPTY_COMPANY);

  const [siteDlg, setSiteDlg] = useState(false);
  const [siteEdit, setSiteEdit] = useState<Site | null>(null);
  const [siteForm, setSiteForm] = useState<SiteForm>(EMPTY_SITE);

  const [eqDlg, setEqDlg] = useState(false);
  const [eqEdit, setEqEdit] = useState<Equipment | null>(null);
  const [eqForm, setEqForm] = useState<EquipmentForm>(EMPTY_EQUIPMENT);

  const [err, setErr] = useState<string | null>(null);

  // ── 쿼리 ──
  const companiesQ = useQuery({ queryKey: ["org-companies"], queryFn: fetchCompanies, enabled: isAdmin, staleTime: 60_000 });
  const sitesQ = useQuery({ queryKey: ["org-sites"], queryFn: fetchSites, enabled: isAdmin, staleTime: 60_000 });
  const equipmentsQ = useQuery({ queryKey: ["org-equipments"], queryFn: fetchEquipments, enabled: isAdmin, staleTime: 60_000 });

  const companies = useMemo(() => companiesQ.data ?? [], [companiesQ.data]);
  const sites = useMemo(() => sitesQ.data ?? [], [sitesQ.data]);
  const equipments = useMemo(() => equipmentsQ.data ?? [], [equipmentsQ.data]);

  // ── 뮤테이션 (법인) ──
  const saveCompany = useMutation({
    mutationFn: async (vars: { form: CompanyForm; id?: string }) => {
      const body = { code: vars.form.code, name: vars.form.name, description: vars.form.description || null, is_active: vars.form.is_active };
      if (vars.id) {
        return rest("PATCH", "companies", { params: { id: `eq.${vars.id}` }, body, prefer: "return=representation" });
      }
      return rest("POST", "companies", { body, prefer: "return=representation" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-companies"] });
      qc.invalidateQueries({ queryKey: ["org-sites"] });
      qc.invalidateQueries({ queryKey: ["org-equipments"] });
      setCoDlg(false); setCoEdit(null); setCoForm(EMPTY_COMPANY);
    },
    onError: (e: Error) => setErr(`법인 저장 실패: ${e.message}`),
  });

  const saveSite = useMutation({
    mutationFn: async (vars: { form: SiteForm; id?: string }) => {
      const body = { company_id: vars.form.company_id, code: vars.form.code, name: vars.form.name, description: vars.form.description || null, is_active: vars.form.is_active };
      if (vars.id) {
        return rest("PATCH", "sites", { params: { id: `eq.${vars.id}` }, body, prefer: "return=representation" });
      }
      return rest("POST", "sites", { body, prefer: "return=representation" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-sites"] });
      qc.invalidateQueries({ queryKey: ["org-equipments"] });
      setSiteDlg(false); setSiteEdit(null); setSiteForm(EMPTY_SITE);
    },
    onError: (e: Error) => setErr(`사업장 저장 실패: ${e.message}`),
  });

  const saveEquipment = useMutation({
    mutationFn: async (vars: { form: EquipmentForm; id?: string }) => {
      const body = { site_id: vars.form.site_id, code: vars.form.code, name: vars.form.name, description: vars.form.description || null, is_active: vars.form.is_active };
      if (vars.id) {
        return rest("PATCH", "equipments", { params: { id: `eq.${vars.id}` }, body, prefer: "return=representation" });
      }
      return rest("POST", "equipments", { body, prefer: "return=representation" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-equipments"] });
      setEqDlg(false); setEqEdit(null); setEqForm(EMPTY_EQUIPMENT);
    },
    onError: (e: Error) => setErr(`설비 저장 실패: ${e.message}`),
  });

  // ── 그리드 ──
  const onReady = useCallback((key: string) => (e: GridReadyEvent) => {
    apis.current[key] = e.api;
    if (key === "companies") setCoApi(e.api);
    else if (key === "sites") setSiteApi(e.api);
    else if (key === "equipments") setEqApi(e.api);
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
    pagination: true, paginationPageSize: 50, suppressPaginationPanel: true,
  };

  // ── 편집 열기 ──
  const openEditCompany = (c: Company) => {
    setCoEdit(c);
    setCoForm({ code: c.code, name: c.name, description: c.description ?? "", is_active: c.is_active });
    setCoDlg(true);
  };
  const openEditSite = (s: Site) => {
    setSiteEdit(s);
    setSiteForm({ company_id: s.company_id, code: s.code, name: s.name, description: s.description ?? "", is_active: s.is_active });
    setSiteDlg(true);
  };
  const openEditEquipment = (e: Equipment) => {
    setEqEdit(e);
    setEqForm({ site_id: e.site_id, code: e.code, name: e.name, description: e.description ?? "", is_active: e.is_active });
    setEqDlg(true);
  };

  const ActionCell = (onEdit: () => void) => (
    <div className="row-acts">
      <button className="ic-btn" onClick={onEdit} title="수정"><EditIcon /></button>
    </div>
  );

  const companyCols = useMemo<ColDef<Company>[]>(() => ([
    { headerName: "코드", field: "code", width: 110, cellRenderer: (p: ICellRendererParams<Company>) => <CodeChip value={p.value} /> },
    { headerName: "법인명", field: "name", width: 190, cellStyle: { fontWeight: 600 } as any },
    { headerName: "설명", field: "description", flex: 1, cellRenderer: (p: ICellRendererParams<Company>) => <DescCell value={p.value} /> },
    { headerName: "상태", field: "is_active", width: 100, cellRenderer: (p: ICellRendererParams<Company>) => <StatusBadge on={p.value} />, filterValueGetter: (p) => p.data?.is_active ? "활성" : "비활성" },
    { headerName: "관리", width: 90, cellRenderer: (p: ICellRendererParams<Company>) => ActionCell(() => p.data && openEditCompany(p.data)), sortable: false, filter: false, cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any },
  ]), []);

  const siteCols = useMemo<ColDef<Site>[]>(() => ([
    { headerName: "법인", field: "company", width: 190, cellRenderer: (p: ICellRendererParams<Site>) => <CompanyChip value={p.value} />, filterValueGetter: (p) => p.data?.company ? `${p.data.company.name} (${p.data.company.code})` : "" },
    { headerName: "코드", field: "code", width: 140, cellRenderer: (p: ICellRendererParams<Site>) => <CodeChip value={p.value} /> },
    { headerName: "사업장명", field: "name", width: 200, cellStyle: { fontWeight: 600 } as any },
    { headerName: "설명", field: "description", flex: 1, cellRenderer: (p: ICellRendererParams<Site>) => <DescCell value={p.value} /> },
    { headerName: "상태", field: "is_active", width: 100, cellRenderer: (p: ICellRendererParams<Site>) => <StatusBadge on={p.value} />, filterValueGetter: (p) => p.data?.is_active ? "활성" : "비활성" },
    { headerName: "관리", width: 90, cellRenderer: (p: ICellRendererParams<Site>) => ActionCell(() => p.data && openEditSite(p.data)), sortable: false, filter: false, cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any },
  ]), []);

  const eqCols = useMemo<ColDef<Equipment>[]>(() => ([
    { headerName: "법인", field: "company", width: 170, cellRenderer: (p: ICellRendererParams<Equipment>) => <CompanyChip value={p.value} />, filterValueGetter: (p) => p.data?.company ? `${p.data.company.name} (${p.data.company.code})` : "" },
    { headerName: "사업장", field: "site", width: 160, cellRenderer: (p: ICellRendererParams<Equipment>) => <SiteChip value={p.value} />, filterValueGetter: (p) => p.data?.site ? p.data.site.name : "" },
    { headerName: "코드", field: "code", width: 120, cellRenderer: (p: ICellRendererParams<Equipment>) => <CodeChip value={p.value} /> },
    { headerName: "설비명", field: "name", width: 190, cellStyle: { fontWeight: 600 } as any },
    { headerName: "설명", field: "description", flex: 1, cellRenderer: (p: ICellRendererParams<Equipment>) => <DescCell value={p.value} /> },
    { headerName: "상태", field: "is_active", width: 100, cellRenderer: (p: ICellRendererParams<Equipment>) => <StatusBadge on={p.value} />, filterValueGetter: (p) => p.data?.is_active ? "활성" : "비활성" },
    { headerName: "관리", width: 90, cellRenderer: (p: ICellRendererParams<Equipment>) => ActionCell(() => p.data && openEditEquipment(p.data)), sortable: false, filter: false, cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any },
  ]), []);

  const switchTab = (t: Tab) => {
    setTab(t);
    setTimeout(() => Object.values(apis.current).forEach(api => api?.sizeColumnsToFit()), 0);
  };

  const activeCo = companies.filter(c => c.is_active).length;
  const inactiveCount =
    companies.filter(c => !c.is_active).length +
    sites.filter(s => !s.is_active).length +
    equipments.filter(e => !e.is_active).length;

  // 법인 선택 목록 (form combobox) — 활성 우선이지만 편집 중인 비활성도 표시
  const sitesByCompanyActive = useMemo(() => sites, [sites]);

  // ── admin 게이트 ──
  if (!isAdmin) {
    return (
      <section className="page-card" style={{ marginBottom: 0 }}>
        <style>{PAGE_STYLES}</style>
        <div className="page-h">
          <div>
            <h1>조직관리</h1>
          </div>
        </div>
        <div className="callout-danger">
          <strong>접근 권한 없음</strong> — 이 페이지는 관리자(admin)만 볼 수 있습니다.
        </div>
      </section>
    );
  }


  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>조직관리 <span className="t-badge">관리자용</span></h1>
        </div>
      </div>

      {err && (
        <div className="callout-danger" style={{ marginTop: 12 }} onClick={() => setErr(null)} role="alert">
          {err} <span style={{ float: "right", cursor: "pointer" }}>✕</span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3" style={{ marginTop: 16 }}>
        <div className="stat-card">
          <div className="stat-icon co">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>
          </div>
          <div>
            <div className="stat-val">{companies.length}</div>
            <div className="stat-label">법인 (활성 {activeCo})</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon site">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          </div>
          <div>
            <div className="stat-val">{sites.length}</div>
            <div className="stat-label">사업장</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon eq">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div>
            <div className="stat-val">{equipments.length.toLocaleString()}</div>
            <div className="stat-label">설비</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon inactive">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </div>
          <div>
            <div className="stat-val">{inactiveCount}</div>
            <div className="stat-label">비활성 (법인/사업장/설비 합)</div>
          </div>
        </div>
      </div>

      <div className="callout-info">
        💡 비활성(is_active=false) 항목은 신청 시 콤보박스에 노출되지 않습니다. 삭제 대신 비활성 토글로 관리하세요.
      </div>

      <div className="tabs">
        <button className={tab === "companies" ? "on" : ""} onClick={() => switchTab("companies")}>법인 <span className="ct">{companies.length}</span></button>
        <button className={tab === "sites" ? "on" : ""} onClick={() => switchTab("sites")}>사업장 <span className="ct">{sites.length}</span></button>
        <button className={tab === "equipments" ? "on" : ""} onClick={() => switchTab("equipments")}>설비 <span className="ct">{equipments.length.toLocaleString()}</span></button>
      </div>

      {tab === "companies" && (
        <>
          <div className="org-toolbar">
            <div className="search-box">
              <svg className="ic-search" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="법인명 · 코드 검색…" value={qCo} onChange={(e) => setQCo(e.target.value)} />
            </div>
            <span className="t-meta">전체 <strong className="t-navy">{companies.length}개</strong></span>
            <span style={{ flex: 1 }}></span>
            <GridPager api={coApi} pageSizeOptions={[25, 50, 100]} />
            <button className="btn-primary" onClick={() => { setCoEdit(null); setCoForm(EMPTY_COMPANY); setCoDlg(true); }}>+ 법인 추가</button>
          </div>
          <div className="ag-theme-quartz" style={{ height: 480 }}>
            <AgGridReact<Company> rowData={companies} columnDefs={companyCols} quickFilterText={qCo} onGridReady={onReady("companies")} {...baseGrid} />
          </div>
        </>
      )}

      {tab === "sites" && (
        <>
          <div className="org-toolbar">
            <div className="search-box">
              <svg className="ic-search" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="사업장명 · 코드 · 법인 검색…" value={qSite} onChange={(e) => setQSite(e.target.value)} />
            </div>
            <span className="t-meta">전체 <strong className="t-navy">{sites.length}개</strong></span>
            <span style={{ flex: 1 }}></span>
            <GridPager api={siteApi} pageSizeOptions={[25, 50, 100]} />
            <button className="btn-primary" onClick={() => { setSiteEdit(null); setSiteForm(EMPTY_SITE); setSiteDlg(true); }}>+ 사업장 추가</button>
          </div>
          <div className="ag-theme-quartz" style={{ height: 480 }}>
            <AgGridReact<Site> rowData={sites} columnDefs={siteCols} quickFilterText={qSite} onGridReady={onReady("sites")} {...baseGrid} />
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
            <span className="t-meta">전체 <strong className="t-navy">{equipments.length.toLocaleString()}개</strong></span>
            <span style={{ flex: 1 }}></span>
            <GridPager api={eqApi} pageSizeOptions={[25, 50, 100]} />
            <button className="btn-primary" onClick={() => { setEqEdit(null); setEqForm(EMPTY_EQUIPMENT); setEqDlg(true); }}>+ 설비 추가</button>
          </div>
          <div className="ag-theme-quartz" style={{ height: 480 }}>
            <AgGridReact<Equipment> rowData={equipments} columnDefs={eqCols} quickFilterText={qEq} onGridReady={onReady("equipments")} {...baseGrid} />
          </div>
        </>
      )}

      {/* ── 법인 다이얼로그 ── */}
      {coDlg && (
        <div className="dlg-overlay" onClick={() => setCoDlg(false)}>
          <div className="dlg" onClick={(e) => e.stopPropagation()}>
            <div className="dlg-h">{coEdit ? "법인 수정" : "법인 추가"}</div>
            <div className="dlg-body">
              <div className="frow">
                <div className="fcell">
                  <label>코드 *</label>
                  <input value={coForm.code} onChange={(e) => setCoForm({ ...coForm, code: e.target.value })} placeholder="SPI" />
                </div>
                <div className="fcell">
                  <label>법인명 *</label>
                  <input value={coForm.name} onChange={(e) => setCoForm({ ...coForm, name: e.target.value })} placeholder="삼표산업" />
                </div>
              </div>
              <div className="fcell">
                <label>설명</label>
                <input value={coForm.description} onChange={(e) => setCoForm({ ...coForm, description: e.target.value })} />
              </div>
              <label className="switch-row">
                <input type="checkbox" checked={coForm.is_active} onChange={(e) => setCoForm({ ...coForm, is_active: e.target.checked })} />
                <span>활성화</span>
              </label>
            </div>
            <div className="dlg-foot">
              <button className="btn-sec" onClick={() => setCoDlg(false)}>취소</button>
              <button
                className="btn-primary"
                disabled={!coForm.code.trim() || !coForm.name.trim() || saveCompany.isPending}
                onClick={() => { setErr(null); saveCompany.mutate({ form: coForm, id: coEdit?.id }); }}
              >
                {saveCompany.isPending ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 사업장 다이얼로그 ── */}
      {siteDlg && (
        <div className="dlg-overlay" onClick={() => setSiteDlg(false)}>
          <div className="dlg" onClick={(e) => e.stopPropagation()}>
            <div className="dlg-h">{siteEdit ? "사업장 수정" : "사업장 추가"}</div>
            <div className="dlg-body">
              <div className="fcell">
                <label>법인 *</label>
                <select value={siteForm.company_id} onChange={(e) => setSiteForm({ ...siteForm, company_id: e.target.value })}>
                  <option value="">법인 선택…</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code}){!c.is_active ? " · 비활성" : ""}</option>
                  ))}
                </select>
              </div>
              <div className="frow">
                <div className="fcell">
                  <label>코드 *</label>
                  <input value={siteForm.code} onChange={(e) => setSiteForm({ ...siteForm, code: e.target.value })} placeholder="HQ" />
                </div>
                <div className="fcell">
                  <label>사업장명 *</label>
                  <input value={siteForm.name} onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })} placeholder="본사" />
                </div>
              </div>
              <div className="fcell">
                <label>설명</label>
                <input value={siteForm.description} onChange={(e) => setSiteForm({ ...siteForm, description: e.target.value })} />
              </div>
              <label className="switch-row">
                <input type="checkbox" checked={siteForm.is_active} onChange={(e) => setSiteForm({ ...siteForm, is_active: e.target.checked })} />
                <span>활성화</span>
              </label>
            </div>
            <div className="dlg-foot">
              <button className="btn-sec" onClick={() => setSiteDlg(false)}>취소</button>
              <button
                className="btn-primary"
                disabled={!siteForm.company_id || !siteForm.code.trim() || !siteForm.name.trim() || saveSite.isPending}
                onClick={() => { setErr(null); saveSite.mutate({ form: siteForm, id: siteEdit?.id }); }}
              >
                {saveSite.isPending ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 설비 다이얼로그 ── */}
      {eqDlg && (
        <div className="dlg-overlay" onClick={() => setEqDlg(false)}>
          <div className="dlg" onClick={(e) => e.stopPropagation()}>
            <div className="dlg-h">{eqEdit ? "설비 수정" : "설비 추가"}</div>
            <div className="dlg-body">
              <div className="fcell">
                <label>사업장 *</label>
                <select value={eqForm.site_id} onChange={(e) => setEqForm({ ...eqForm, site_id: e.target.value })}>
                  <option value="">사업장 선택…</option>
                  {sitesByCompanyActive.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.company ? `${s.company.code} - ` : ""}{s.name} ({s.code}){!s.is_active ? " · 비활성" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="frow">
                <div className="fcell">
                  <label>코드 *</label>
                  <input value={eqForm.code} onChange={(e) => setEqForm({ ...eqForm, code: e.target.value })} placeholder="EQ001" />
                </div>
                <div className="fcell">
                  <label>설비명 *</label>
                  <input value={eqForm.name} onChange={(e) => setEqForm({ ...eqForm, name: e.target.value })} placeholder="크러셔" />
                </div>
              </div>
              <div className="fcell">
                <label>설명</label>
                <input value={eqForm.description} onChange={(e) => setEqForm({ ...eqForm, description: e.target.value })} />
              </div>
              <label className="switch-row">
                <input type="checkbox" checked={eqForm.is_active} onChange={(e) => setEqForm({ ...eqForm, is_active: e.target.checked })} />
                <span>활성화</span>
              </label>
            </div>
            <div className="dlg-foot">
              <button className="btn-sec" onClick={() => setEqDlg(false)}>취소</button>
              <button
                className="btn-primary"
                disabled={!eqForm.site_id || !eqForm.code.trim() || !eqForm.name.trim() || saveEquipment.isPending}
                onClick={() => { setErr(null); saveEquipment.mutate({ form: eqForm, id: eqEdit?.id }); }}
              >
                {saveEquipment.isPending ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const PAGE_STYLES = `
.t-badge { display:inline-block; vertical-align:middle; margin-left:8px; padding:1px 8px; border-radius:9999px; background:#003876; color:#fff; font-size:11px; font-weight:600; }

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
.callout-danger { background: #fef2f2; border-left: 3px solid #b91c1c; padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #7f1d1d; }

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
.btn-primary:disabled { background: #94a3b8; border-color: #94a3b8; cursor: not-allowed; }
.btn-sec { background: #fff; color: #003876; border: 1px solid #cbd5e1; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.btn-sec:hover { background: #eff6ff; border-color: #003876; }

.code-chip { display: inline-block; padding: 1px 7px; border-radius: 4px; background: #f1f5f9; color: #003876; border: 1px solid #cbd5e1; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; font-weight: 600; line-height: 1.5; }
.company-chip { display: inline-flex; align-items: center; gap: 4px; background: #f8fafc; color: #1f2937; border: 1px solid #e2e8f0; border-radius: 4px; padding: 1px 8px; font-size: 13px; line-height: 1.5; }
.company-chip svg { width: 11px; height: 11px; color: #64748b; }
.badge-status { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 600; line-height: 1.5; }
.badge-status.active { background: #ecfdf5; color: #047857; border: 1px solid #bbf7d0; }
.badge-status.inactive { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }

.row-acts { display: flex; gap: 4px; justify-content: center; }
.row-acts .ic-btn { width: 28px; height: 28px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; border-radius: 6px; color: #475569; display: inline-flex; align-items: center; justify-content: center; }
.row-acts .ic-btn:hover { background: #eff6ff; color: #003876; border-color: #003876; }
.row-acts svg { width: 14px; height: 14px; }

.t-meta { font-size: 13px; font-weight: 500; color: #64748b; }
.t-navy { color: #003876 !important; }

/* 다이얼로그 */
.dlg-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.dlg { background: #fff; border-radius: 12px; width: 480px; max-width: calc(100vw - 32px); box-shadow: 0 20px 50px rgba(0,0,0,0.25); overflow: hidden; }
.dlg-h { padding: 16px 20px; font-size: 16px; font-weight: 700; color: #003876; border-bottom: 1px solid #e2e8f0; }
.dlg-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.dlg-foot { padding: 14px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 8px; background: #f8fafc; }
.frow { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.fcell { display: flex; flex-direction: column; gap: 6px; }
.fcell label { font-size: 13px; font-weight: 600; color: #1f2937; }
.fcell input, .fcell select { width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: #1f2937; background: #fff; }
.fcell input:focus, .fcell select:focus { outline: none; border-color: #003876; box-shadow: 0 0 0 2px rgba(0,56,118,0.1); }
.switch-row { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #1f2937; cursor: pointer; }
.switch-row input { width: 16px; height: 16px; accent-color: #003876; cursor: pointer; }
`;
