import { useCallback, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  type ColDef,
  type GridReadyEvent,
  type ICellRendererParams,
} from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

type Company = { code: string; name: string };
type Role = { role: "admin" | "reviewer" | "user"; company?: string };
type UserRow = {
  name: string;
  email: string;
  department: string | null;
  company: Company | null;
  roles: Role[];
  joined: string;
};

const COMPANIES: Company[] = [
  { code: "SPI", name: "삼표산업" },
  { code: "TYC", name: "삼표시멘트" },
  { code: "SPENC", name: "P&C" },
  { code: "SPRAIL", name: "레일웨이" },
  { code: "SPE", name: "팬트랙" },
  { code: "NDW", name: "에스피네이처" },
  { code: "DAMUL", name: "자원개발" },
  { code: "SPRC", name: "삼표레미콘" },
];
const DEPTS = ["PI팀", "구매팀", "품질팀", "생산팀", "안전팀", "공무팀", "정비팀", "영업팀"];
const NAMES = ["채현석", "김미경", "박상필", "최병진", "권혁수", "이정훈", "정수민", "조태영", "한지영", "송다은", "오현우", "윤시현", "강민호", "장경수", "임소영", "노현주", "백승호", "허윤정"];
const EMAILS = ["chae1008", "kim.mk", "park.sp", "choi.bj", "kwon.hs", "lee.jh", "jung.sm", "cho.ty", "han.jy", "song.de", "oh.hw", "yoon.sh", "kang.mh", "jang.ks", "lim.so", "noh.hj", "baek.sh", "heo.yj"];

function buildRoles(i: number): Role[] {
  if (i === 0) return [{ role: "admin" }];
  if (i % 9 === 0) return [
    { role: "reviewer", company: "SPI" },
    { role: "reviewer", company: "TYC" },
  ];
  if (i % 4 === 0) return [{ role: "reviewer", company: COMPANIES[i % COMPANIES.length].code }];
  return [{ role: "user" }];
}

const ROWS: UserRow[] = Array.from({ length: 18 }, (_, i) => {
  const co = i % 5 === 4 ? null : COMPANIES[i % COMPANIES.length];
  const days = i * 7 + 3;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return {
    name: NAMES[i],
    email: `${EMAILS[i]}@sampyo.co.kr`,
    department: i % 7 === 6 ? null : DEPTS[i % DEPTS.length],
    company: co,
    roles: buildRoles(i),
    joined: d.toISOString().slice(0, 10),
  };
});

const CompanyCell = (p: ICellRendererParams<UserRow, Company | null>) => {
  const c = p.value;
  if (!c) {
    return (
      <span className="company-chip unset">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
        미설정
      </span>
    );
  }
  return (
    <span className="company-chip">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>
      {c.name} ({c.code})
    </span>
  );
};

const RolesCell = (p: ICellRendererParams<UserRow, Role[]>) => {
  const roles = p.value;
  if (!roles || roles.length === 0) return <span className="badge-role user">일반사용자</span>;
  return (
    <>
      {roles.map((r, i) => {
        if (r.role === "admin") return <span key={i} className="role-group"><span className="badge-role admin">admin</span></span>;
        if (r.role === "reviewer") return (
          <span key={i} className="role-group">
            <span className="badge-role reviewer">reviewer</span>
            <span className="scope">({r.company ?? "전사"})</span>
          </span>
        );
        return <span key={i} className="role-group"><span className="badge-role user">일반사용자</span></span>;
      })}
    </>
  );
};

const ActionsCell = ({ onAddRole }: { onAddRole: () => void }) => (
  <div className="row-acts">
    <button className="ic-btn add" onClick={onAddRole}>+ 역할</button>
    <button className="ic-btn del" title="삭제">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
    </button>
  </div>
);

export function UserManagementPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const columnDefs = useMemo<ColDef<UserRow>[]>(() => ([
    { headerName: "이름", field: "name", width: 110, cellStyle: { fontWeight: 600 } as any },
    { headerName: "이메일", field: "email", width: 220, cellClass: "t-mono", cellStyle: { color: "#64748b", fontSize: "13px" } as any },
    {
      headerName: "부서", field: "department", width: 110,
      valueFormatter: (p) => p.value || "—",
    },
    {
      headerName: "법인", field: "company", width: 170,
      cellRenderer: CompanyCell,
      filterValueGetter: (p) => p.data?.company ? `${p.data.company.name} (${p.data.company.code})` : "미설정",
    },
    {
      headerName: "역할", field: "roles", width: 240,
      cellRenderer: RolesCell,
      filterValueGetter: (p) => (p.data?.roles || []).map(r => r.role + (r.company ? ":" + r.company : "")).join(", "),
      sortable: false,
    },
    { headerName: "가입일", field: "joined", width: 105 },
    {
      headerName: "관리", width: 125,
      cellRenderer: () => <ActionsCell onAddRole={() => setDialogOpen(true)} />,
      sortable: false, filter: false,
      cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any,
    },
  ]), []);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const totalUsers = ROWS.length;
  const adminCount = ROWS.filter(r => r.roles.some(x => x.role === "admin")).length;
  const reviewerCount = ROWS.filter(r => r.roles.some(x => x.role === "reviewer")).length;

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>
            사용자관리
            <span className="text-xs text-gray-500 font-normal ml-2">/ admin/users</span>
          </h1>
          <div className="meta">시스템 사용자 · 역할 · 법인 매핑 관리</div>
        </div>
        <div className="actions">
          <button className="btn-sec">⬇ 사용자 내보내기</button>
        </div>
      </div>

      {/* KPI 3 카드 */}
      <div className="grid grid-cols-3 gap-3" style={{ marginTop: 16 }}>
        <div className="stat-card">
          <div className="stat-icon users">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div>
            <div className="stat-val">{totalUsers}</div>
            <div className="stat-label">전체 사용자</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon admin">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <div className="stat-val">{adminCount}</div>
            <div className="stat-label">관리자</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon reviewer">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div>
            <div className="stat-val">{reviewerCount}</div>
            <div className="stat-label">검토자</div>
          </div>
        </div>
      </div>

      <div className="callout-info">
        💡 HR API 연동으로 신규 사용자는 첫 로그인 시 자동 등록됩니다. 사전등록 역할은 <strong>pending_user_roles</strong> 테이블로 미리 부여 가능.
      </div>

      {/* Toolbar */}
      <div className="user-toolbar">
        <div className="search-box">
          <svg className="ic-search" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="이름 · 이메일 · 부서로 검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="t-meta">전체 <strong className="t-navy">{totalUsers}명</strong></span>
        <span style={{ flex: 1 }}></span>
        <button className="btn-sec">📋 사전등록 역할 부여</button>
        <button className="btn-primary">+ 사용자 초대</button>
      </div>

      <div className="ag-theme-quartz" style={{ height: 560 }}>
        <AgGridReact<UserRow>
          rowData={ROWS}
          columnDefs={columnDefs}
          rowHeight={52}
          headerHeight={36}
          suppressCellFocus
          suppressMenuHide
          defaultColDef={{
            sortable: true, resizable: true,
            filter: "agTextColumnFilter",
            menuTabs: ["filterMenuTab", "generalMenuTab"],
          }}
          pagination
          paginationPageSize={50}
          paginationPageSizeSelector={[25, 50, 100]}
          quickFilterText={search}
          onGridReady={onGridReady}
        />
      </div>

      {/* Dialog: 역할 추가 */}
      {dialogOpen && (
        <div className="dialog-overlay" onClick={() => setDialogOpen(false)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-head">
              <h3>역할 추가</h3>
              <button className="close" onClick={() => setDialogOpen(false)}>×</button>
            </div>
            <div className="dialog-body">
              <div className="form-row">
                <label>역할</label>
                <select><option>reviewer (검토자)</option><option>admin (관리자)</option></select>
              </div>
              <div className="form-row">
                <label>적용 범위</label>
                <select><option>특정 법인 (검토자만)</option><option>전사 (admin)</option></select>
              </div>
              <div className="form-row">
                <label>법인</label>
                <select>
                  {COMPANIES.map(c => <option key={c.code}>{c.name} ({c.code})</option>)}
                </select>
              </div>
            </div>
            <div className="dialog-foot">
              <button className="btn-sec" onClick={() => setDialogOpen(false)}>취소</button>
              <button className="btn-primary">역할 부여</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// 페이지 전용 스타일 (mockup의 SDS 토큰 위 추가분)
const PAGE_STYLES = `
.stat-card {
  background: #fff; border: 1px solid #cbd5e1; border-radius: 8px;
  padding: 16px 20px; display: flex; align-items: center; gap: 16px;
}
.stat-card .stat-icon {
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center; border-radius: 10px;
}
.stat-card .stat-icon.users { background: #eff6ff; color: #003876; }
.stat-card .stat-icon.admin { background: #fef2f2; color: #b91c1c; }
.stat-card .stat-icon.reviewer { background: #ecfdf5; color: #047857; }
.stat-card .stat-icon svg { width: 22px; height: 22px; }
.stat-card .stat-val { font-size: 24px; font-weight: 700; color: #003876; line-height: 1.1; }
.stat-card .stat-label { font-size: 13px; color: #64748b; margin-top: 4px; }

.callout-info {
  background: #eff6ff; border-left: 3px solid #003876;
  padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #1e293b;
  margin-top: 16px;
}

.user-toolbar {
  background: #fff; border: 1px solid #cbd5e1; border-radius: 8px;
  padding: 12px 16px; margin: 16px 0 12px 0;
  display: flex; align-items: center; gap: 12px;
}
.user-toolbar .search-box { position: relative; flex: 1; max-width: 380px; }
.user-toolbar .search-box input {
  width: 100%; padding: 8px 12px 8px 34px;
  border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: #1f2937;
}
.user-toolbar .search-box input:focus { outline: none; border-color: #003876; box-shadow: 0 0 0 2px rgba(0,56,118,0.1); }
.user-toolbar .search-box .ic-search {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  width: 16px; height: 16px; color: #94a3b8;
}
.btn-primary {
  background: #003876; color: #fff; border: 1px solid #003876;
  padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500;
  cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
}
.btn-primary:hover { background: #002a5c; }
.btn-sec {
  background: #fff; color: #003876; border: 1px solid #cbd5e1;
  padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500;
  cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
}
.btn-sec:hover { background: #eff6ff; border-color: #003876; }
.t-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.t-meta { font-size: 13px; font-weight: 500; color: #64748b; }
.t-navy { color: #003876 !important; }

.badge-role {
  display: inline-block; padding: 1px 7px; border-radius: 999px;
  font-size: 11px; font-weight: 600; line-height: 1.5;
}
.badge-role.admin { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.badge-role.reviewer { background: #ecfdf5; color: #047857; border: 1px solid #bbf7d0; }
.badge-role.user { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
.role-group { display: inline-flex; align-items: center; gap: 3px; margin-right: 5px; }
.role-group .scope { font-size: 11px; color: #64748b; }

.company-chip {
  display: inline-flex; align-items: center; gap: 4px;
  background: #f8fafc; color: #1f2937;
  border: 1px solid #e2e8f0; border-radius: 4px;
  padding: 1px 8px; font-size: 13px; line-height: 1.5;
}
.company-chip:hover { border-color: #003876; color: #003876; background: #eff6ff; }
.company-chip svg { width: 11px; height: 11px; color: #64748b; }
.company-chip.unset { color: #94a3b8; }

.row-acts { display: flex; gap: 4px; justify-content: center; }
.row-acts .ic-btn {
  height: 28px; padding: 0 10px;
  border: 1px solid #cbd5e1; background: #fff; cursor: pointer; border-radius: 6px;
  color: #475569; font-size: 12px;
  display: inline-flex; align-items: center; justify-content: center;
}
.row-acts .ic-btn:hover { background: #eff6ff; color: #003876; border-color: #003876; }
.row-acts .ic-btn.del { width: 28px; padding: 0; }
.row-acts .ic-btn.del:hover { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
.row-acts svg { width: 14px; height: 14px; }

.dialog-overlay {
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.dialog-box {
  background: #fff; border-radius: 10px; width: 480px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.25); overflow: hidden;
}
.dialog-head {
  padding: 16px 20px; border-bottom: 1px solid #e2e8f0;
  display: flex; justify-content: space-between; align-items: center;
}
.dialog-head h3 { font-size: 16px; font-weight: 700; color: #003876; margin: 0; }
.dialog-head .close { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 20px; }
.dialog-body { padding: 18px 20px; }
.form-row { margin-bottom: 14px; }
.form-row label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px; }
.form-row select, .form-row input {
  width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;
}
.dialog-foot {
  padding: 12px 20px; border-top: 1px solid #e2e8f0; background: #f8fafc;
  display: flex; justify-content: flex-end; gap: 8px;
}
`;
