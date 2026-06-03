import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  type ColDef,
  type GridReadyEvent,
  type ICellRendererParams,
} from "ag-grid-community";
import { rest } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

ModuleRegistry.registerModules([AllCommunityModule]);

type AppRole = "admin" | "reviewer" | "user";

type Company = { id: string; code: string; name: string };

type UserRoleEntry = {
  role: AppRole | string;
  company_id: string | null;
  company_name: string | null;
};

type UserRow = {
  id: string; // profiles.id
  user_id: string; // profiles.user_id (user_roles FK 대상)
  display_name: string;
  email: string | null;
  department: string | null;
  company_id: string | null;
  company: Company | null;
  company_text: string | null; // legacy free-text fallback
  created_at: string;
  roles: UserRoleEntry[];
};

// ── 실 DB 응답 raw 타입 ──────────────────────────────────────────────
type ProfileRaw = {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  department: string | null;
  company_id: string | null;
  company: string | null; // legacy free-text
  created_at: string;
  company_info: { id: string; code: string; name: string } | null;
};

type RoleRaw = {
  user_id: string;
  role: string;
  company_id: string | null;
  companies: { name: string } | null;
};

async function fetchUsersAndCompanies(): Promise<{ users: UserRow[]; companies: Company[] }> {
  const [profiles, roles, companies] = await Promise.all([
    rest<ProfileRaw[]>("GET", "profiles", {
      params: {
        select: "id,user_id,display_name,email,department,company_id,company,created_at,company_info:companies(id,code,name)",
        order: "created_at.desc",
      },
    }),
    rest<RoleRaw[]>("GET", "user_roles", {
      params: { select: "user_id,role,company_id,companies:company_id(name)" },
    }),
    rest<Company[]>("GET", "companies", {
      params: { select: "id,code,name", is_active: "eq.true", order: "sort_order.asc" },
    }),
  ]);

  const users: UserRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    user_id: p.user_id,
    display_name: p.display_name ?? "",
    email: p.email,
    department: p.department,
    company_id: p.company_id,
    company: p.company_info,
    company_text: p.company,
    created_at: p.created_at,
    roles: (roles ?? [])
      .filter((r) => r.user_id === p.user_id)
      .map((r) => ({
        role: r.role,
        company_id: r.company_id ?? null,
        company_name: r.companies?.name ?? null,
      })),
  }));

  return { users, companies: companies ?? [] };
}

// ── 셀 렌더러 ────────────────────────────────────────────────────────
const CompanyCell = (p: ICellRendererParams<UserRow>) => {
  const u = p.data;
  if (!u) return null;
  if (!u.company) {
    return (
      <span className="company-chip unset">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
        {u.company_text || "미설정"}
      </span>
    );
  }
  return (
    <span className="company-chip">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>
      {u.company.name} ({u.company.code})
    </span>
  );
};

// ── 메인 ─────────────────────────────────────────────────────────────
export function UserManagementPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["user-management"],
    queryFn: fetchUsersAndCompanies,
    staleTime: 30_000,
    enabled: isAdmin,
  });

  const users = useMemo(() => data?.users ?? [], [data]);
  const companies = useMemo(() => data?.companies ?? [], [data]);

  const [search, setSearch] = useState("");

  // 다이얼로그 상태
  const [roleTarget, setRoleTarget] = useState<UserRow | null>(null);
  const [companyTarget, setCompanyTarget] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  // 역할 추가 폼
  const [selRole, setSelRole] = useState<AppRole | "">("");
  const [selRoleCompanyId, setSelRoleCompanyId] = useState<string>(""); // "" = 전사
  // 법인 설정 폼
  const [selCompanyId, setSelCompanyId] = useState<string>("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["user-management"] });

  // ── 쓰기: 역할 추가 ────────────────────────────────────────────────
  const addRoleMut = useMutation({
    mutationFn: async (vars: { userId: string; role: AppRole; companyId: string | null }) => {
      await rest("POST", "user_roles", {
        body: { user_id: vars.userId, role: vars.role, company_id: vars.companyId },
        prefer: "return=representation",
      });
    },
    onSuccess: () => {
      invalidate();
      setRoleTarget(null);
    },
    onError: (e: unknown) => alert(`역할 추가 실패: ${(e as Error).message}`),
  });

  // ── 쓰기: 역할 제거 ────────────────────────────────────────────────
  const removeRoleMut = useMutation({
    mutationFn: async (vars: { userId: string; role: string; companyId: string | null }) => {
      const params: Record<string, string> = {
        user_id: `eq.${vars.userId}`,
        role: `eq.${vars.role}`,
        company_id: vars.companyId ? `eq.${vars.companyId}` : "is.null",
      };
      await rest("DELETE", "user_roles", { params });
    },
    onSuccess: invalidate,
    onError: (e: unknown) => alert(`역할 제거 실패: ${(e as Error).message}`),
  });

  // ── 쓰기: 법인 설정 ────────────────────────────────────────────────
  const updateCompanyMut = useMutation({
    mutationFn: async (vars: { profileId: string; companyId: string | null }) => {
      await rest("PATCH", "profiles", {
        params: { id: `eq.${vars.profileId}` },
        body: { company_id: vars.companyId },
        prefer: "return=representation",
      });
    },
    onSuccess: () => {
      invalidate();
      setCompanyTarget(null);
    },
    onError: (e: unknown) => alert(`법인 설정 실패: ${(e as Error).message}`),
  });

  // ── 쓰기: 사용자 삭제 (2단계) ──────────────────────────────────────
  const deleteUserMut = useMutation({
    mutationFn: async (vars: { profileId: string; userId: string }) => {
      // 1) user_roles 먼저 삭제
      await rest("DELETE", "user_roles", { params: { user_id: `eq.${vars.userId}` } });
      // 2) profiles 삭제
      await rest("DELETE", "profiles", { params: { id: `eq.${vars.profileId}` } });
    },
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
    },
    onError: (e: unknown) => alert(`사용자 삭제 실패: ${(e as Error).message}`),
  });

  // ── 핸들러 ─────────────────────────────────────────────────────────
  const openRoleDialog = (u: UserRow) => {
    setRoleTarget(u);
    setSelRole("");
    setSelRoleCompanyId("");
  };
  const openCompanyDialog = (u: UserRow) => {
    setCompanyTarget(u);
    setSelCompanyId(u.company_id ?? "");
  };

  const submitAddRole = () => {
    if (!roleTarget || !selRole) {
      alert("역할을 선택해주세요.");
      return;
    }
    const roleCompanyId = selRole === "reviewer" && selRoleCompanyId ? selRoleCompanyId : null;
    // 동일 (role, company_id) 중복 검사
    if (roleTarget.roles.some((r) => r.role === selRole && (r.company_id ?? null) === roleCompanyId)) {
      alert("이미 부여된 역할입니다.");
      return;
    }
    addRoleMut.mutate({ userId: roleTarget.user_id, role: selRole, companyId: roleCompanyId });
  };

  const submitUpdateCompany = () => {
    if (!companyTarget) return;
    updateCompanyMut.mutate({ profileId: companyTarget.id, companyId: selCompanyId || null });
  };

  const submitDelete = () => {
    if (!deleteTarget) return;
    deleteUserMut.mutate({ profileId: deleteTarget.id, userId: deleteTarget.user_id });
  };

  // ── 역할 셀 (제거 버튼 포함, 핸들러가 클로저로 필요해 컴포넌트 내부 정의) ──
  const RolesCell = useCallback((p: ICellRendererParams<UserRow>) => {
    const u = p.data;
    if (!u) return null;
    if (u.roles.length === 0) return <span className="badge-role user">일반사용자</span>;
    return (
      <div className="roles-wrap">
        {u.roles.map((r) => {
          const label = r.role === "admin" ? "admin" : r.role === "reviewer" ? "reviewer" : "일반사용자";
          const cls = r.role === "admin" ? "admin" : r.role === "reviewer" ? "reviewer" : "user";
          return (
            <span key={`${r.role}-${r.company_id ?? "all"}`} className="role-group">
              <span className={`badge-role ${cls}`}>{label}</span>
              {r.role === "reviewer" && (
                <span className="scope">({r.company_name ?? "전사"})</span>
              )}
              <button
                className="role-x"
                title="역할 제거"
                onClick={() => removeRoleMut.mutate({ userId: u.user_id, role: r.role, companyId: r.company_id })}
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
    );
    // removeRoleMut는 안정적 참조
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 관리 액션 셀 ───────────────────────────────────────────────────
  const ActionsCell = useCallback((p: ICellRendererParams<UserRow>) => {
    const u = p.data;
    if (!u) return null;
    return (
      <div className="row-acts">
        <button className="ic-btn add" onClick={() => openRoleDialog(u)}>+ 역할</button>
        <button className="ic-btn" title="법인 설정" onClick={() => openCompanyDialog(u)}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>
        </button>
        <button className="ic-btn del" title="삭제" onClick={() => setDeleteTarget(u)}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
        </button>
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columnDefs = useMemo<ColDef<UserRow>[]>(() => ([
    { headerName: "이름", field: "display_name", width: 110, cellStyle: { fontWeight: 600 } as any },
    { headerName: "이메일", field: "email", width: 220, cellClass: "t-mono", cellStyle: { color: "#64748b", fontSize: "13px" } as any, valueFormatter: (p) => p.value || "—" },
    {
      headerName: "부서", field: "department", width: 110,
      valueFormatter: (p) => p.value || "—",
    },
    {
      headerName: "법인", field: "company_id", width: 170,
      cellRenderer: CompanyCell,
      filterValueGetter: (p) => p.data?.company ? `${p.data.company.name} (${p.data.company.code})` : (p.data?.company_text || "미설정"),
    },
    {
      headerName: "역할", colId: "roles", width: 260,
      cellRenderer: RolesCell,
      filterValueGetter: (p) => (p.data?.roles || []).map((r) => r.role + (r.company_id ? ":" + (r.company_name ?? r.company_id) : "")).join(", "),
      sortable: false,
    },
    {
      headerName: "가입일", field: "created_at", width: 110,
      valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString("ko-KR") : "—"),
    },
    {
      headerName: "관리", colId: "actions", width: 150,
      cellRenderer: ActionsCell,
      sortable: false, filter: false,
      cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any,
    },
  ]), [RolesCell, ActionsCell]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.roles.some((r) => r.role === "admin")).length;
  const reviewerCount = users.filter((u) => u.roles.some((r) => r.role === "reviewer")).length;

  // ── admin 게이트 ───────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <section className="page-card">
        <style>{PAGE_STYLES}</style>
        <div className="page-h">
          <div>
            <h1>
              사용자관리
              <span className="text-xs text-gray-500 font-normal ml-2">/ admin/users</span>
            </h1>
            <div className="meta">관리자 전용 페이지</div>
          </div>
        </div>
        <div className="callout-danger">
          <div className="ct-title">접근 권한 없음</div>
          <p>이 페이지는 관리자(admin)만 볼 수 있습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>
            사용자관리 <span className="t-badge">관리자용</span>
            <span className="text-xs text-gray-500 font-normal ml-2">/ admin/users</span>
          </h1>
          <div className="meta">
            시스템 사용자 · 역할 · 법인 매핑 관리
            {isLoading && " · 불러오는 중…"}
          </div>
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
        💡 HR API 연동으로 신규 사용자는 첫 로그인 시 자동 등록됩니다. 사전등록 역할은 <strong>pending_user_roles</strong> 테이블로 미리 부여 가능. 역할 뱃지의 <strong>×</strong>로 즉시 제거할 수 있습니다.
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
      </div>

      <div className="ag-theme-quartz" style={{ height: 560 }}>
        <AgGridReact<UserRow>
          rowData={users}
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
          loading={isLoading}
          overlayNoRowsTemplate={'<span style="color:#94a3b8">등록된 사용자가 없습니다</span>'}
        />
      </div>

      {/* Dialog: 역할 추가 */}
      {roleTarget && (
        <div className="dialog-overlay" onClick={() => setRoleTarget(null)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-head">
              <h3>역할 추가</h3>
              <button className="close" onClick={() => setRoleTarget(null)}>×</button>
            </div>
            <div className="dialog-body">
              <div className="dlg-user">
                <div className="dlg-user-name">{roleTarget.display_name}</div>
                <div className="dlg-user-email">{roleTarget.email}</div>
              </div>
              <div className="form-row">
                <label>역할 선택</label>
                <select value={selRole} onChange={(e) => setSelRole(e.target.value as AppRole)}>
                  <option value="">역할을 선택하세요</option>
                  <option value="admin">관리자 (Admin)</option>
                  <option value="reviewer">검토자 (Reviewer)</option>
                  <option value="user">일반사용자 (User)</option>
                </select>
              </div>
              {selRole === "reviewer" && (
                <div className="form-row">
                  <label>담당 회사</label>
                  <select value={selRoleCompanyId} onChange={(e) => setSelRoleCompanyId(e.target.value)}>
                    <option value="">전사 (모든 회사 1차 검토 가능)</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                  <div className="form-hint">선택한 회사의 신청건만 1차 검토할 수 있습니다. 전사 선택 시 모든 회사 검토 가능.</div>
                </div>
              )}
              {selRole && (
                <div className="role-desc">
                  {selRole === "admin" && "시스템 전체를 관리할 수 있는 최고 권한입니다."}
                  {selRole === "reviewer" && "품목 요청을 검토하고 승인/반려할 수 있습니다."}
                  {selRole === "user" && "품목 요청을 생성하고 조회할 수 있습니다."}
                </div>
              )}
            </div>
            <div className="dialog-foot">
              <button className="btn-sec" onClick={() => setRoleTarget(null)}>취소</button>
              <button className="btn-primary" onClick={submitAddRole} disabled={addRoleMut.isPending}>
                {addRoleMut.isPending ? "추가 중…" : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: 법인 설정 */}
      {companyTarget && (
        <div className="dialog-overlay" onClick={() => setCompanyTarget(null)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-head">
              <h3>법인 설정</h3>
              <button className="close" onClick={() => setCompanyTarget(null)}>×</button>
            </div>
            <div className="dialog-body">
              <div className="dlg-user">
                <div className="dlg-user-name">{companyTarget.display_name}</div>
                <div className="dlg-user-email">{companyTarget.email}</div>
              </div>
              <div className="form-row">
                <label>법인 선택</label>
                <select value={selCompanyId} onChange={(e) => setSelCompanyId(e.target.value)}>
                  <option value="">미설정</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div className="role-desc">사용자가 품목코드 신청 시 기본으로 선택되는 법인입니다.</div>
            </div>
            <div className="dialog-foot">
              <button className="btn-sec" onClick={() => setCompanyTarget(null)}>취소</button>
              <button className="btn-primary" onClick={submitUpdateCompany} disabled={updateCompanyMut.isPending}>
                {updateCompanyMut.isPending ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: 사용자 삭제 confirm */}
      {deleteTarget && (
        <div className="dialog-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-head">
              <h3>사용자 삭제</h3>
              <button className="close" onClick={() => setDeleteTarget(null)}>×</button>
            </div>
            <div className="dialog-body">
              <p className="del-msg">
                <strong>{deleteTarget.display_name}</strong> ({deleteTarget.email}) 사용자를 삭제하시겠습니까?
                <br />
                역할과 프로필이 함께 제거되며, 이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="dialog-foot">
              <button className="btn-sec" onClick={() => setDeleteTarget(null)}>취소</button>
              <button className="btn-danger" onClick={submitDelete} disabled={deleteUserMut.isPending}>
                {deleteUserMut.isPending ? "삭제 중…" : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// 페이지 전용 스타일 (mockup의 SDS 토큰 위 추가분)
const PAGE_STYLES = `
.t-badge { display:inline-block; vertical-align:middle; margin-left:8px; padding:1px 8px; border-radius:9999px; background:#003876; color:#fff; font-size:11px; font-weight:600; }

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
.callout-danger {
  background: #fef2f2; border-left: 3px solid #b91c1c;
  padding: 14px 16px; border-radius: 6px; color: #7f1d1d; margin-top: 16px;
}
.callout-danger .ct-title { font-weight: 700; margin-bottom: 4px; }

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
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-sec {
  background: #fff; color: #003876; border: 1px solid #cbd5e1;
  padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500;
  cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
}
.btn-sec:hover { background: #eff6ff; border-color: #003876; }
.btn-danger {
  background: #b91c1c; color: #fff; border: 1px solid #b91c1c;
  padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500;
  cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
}
.btn-danger:hover { background: #991b1b; }
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
.t-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.t-meta { font-size: 13px; font-weight: 500; color: #64748b; }
.t-navy { color: #003876 !important; }

.roles-wrap { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
.badge-role {
  display: inline-block; padding: 1px 7px; border-radius: 999px;
  font-size: 11px; font-weight: 600; line-height: 1.5;
}
.badge-role.admin { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.badge-role.reviewer { background: #ecfdf5; color: #047857; border: 1px solid #bbf7d0; }
.badge-role.user { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
.role-group { display: inline-flex; align-items: center; gap: 3px; }
.role-group .scope { font-size: 11px; color: #64748b; }
.role-group .role-x {
  width: 16px; height: 16px; line-height: 1; border-radius: 999px;
  border: none; background: #e2e8f0; color: #64748b; cursor: pointer;
  font-size: 13px; display: inline-flex; align-items: center; justify-content: center;
}
.role-group .role-x:hover { background: #fecaca; color: #b91c1c; }

.company-chip {
  display: inline-flex; align-items: center; gap: 4px;
  background: #f8fafc; color: #1f2937;
  border: 1px solid #e2e8f0; border-radius: 4px;
  padding: 1px 8px; font-size: 13px; line-height: 1.5;
}
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
.row-acts .ic-btn:not(.add) { width: 28px; padding: 0; }
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
.dlg-user { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; }
.dlg-user-name { font-weight: 600; color: #1f2937; font-size: 14px; }
.dlg-user-email { font-size: 12px; color: #64748b; }
.form-row { margin-bottom: 14px; }
.form-row label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px; }
.form-row select, .form-row input {
  width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;
}
.form-hint { font-size: 11px; color: #94a3b8; margin-top: 5px; }
.role-desc { padding: 10px 12px; background: #f1f5f9; border-radius: 6px; font-size: 13px; color: #475569; }
.del-msg { font-size: 14px; color: #1e293b; line-height: 1.6; }
.dialog-foot {
  padding: 12px 20px; border-top: 1px solid #e2e8f0; background: #f8fafc;
  display: flex; justify-content: flex-end; gap: 8px;
}
`;
