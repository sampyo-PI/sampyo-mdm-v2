import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef, type GridApi, type GridReadyEvent, type ICellRendererParams } from "ag-grid-community";
import { rest, rpc } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

ModuleRegistry.registerModules([AllCommunityModule]);

// ============================================================
// 타입
// ============================================================
type ERPSystem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number | null;
};

type MappingStat = {
  company_code: string;
  total_categories: number;
  mapped_count: number;
  unmapped_count: number;
};

type MappingRow = {
  id: string;
  company_code: string;
  small_category_id: string;
  item_account_code: string | null;
  item_account_name: string | null;
  category_small: { name: string; code: string } | null;
};

type Account = { account_code: string; account_name: string };

const MAPPING_PAGE_SIZE = 30;

// ============================================================
// 데이터 fetch
// ============================================================
async function fetchErpSystems(): Promise<ERPSystem[]> {
  return rest<ERPSystem[]>("GET", "target_erp_systems", {
    params: { select: "*", order: "sort_order.asc" },
  });
}

async function fetchMappingStats(): Promise<MappingStat[]> {
  return rpc<MappingStat[]>("get_company_mapping_stats");
}

async function fetchAccounts(companyCode: string): Promise<Account[]> {
  if (!companyCode) return [];
  return rest<Account[]>("GET", "erp_item_accounts", {
    params: {
      select: "account_code,account_name",
      company_code: `eq.${companyCode}`,
      order: "account_code.asc",
    },
  });
}

async function fetchMappings(args: {
  companyCode: string;
  unmappedOnly: boolean;
  page: number;
}): Promise<{ rows: MappingRow[]; total: number }> {
  if (!args.companyCode) return { rows: [], total: 0 };
  const params: Record<string, string> = {
    select:
      "id,company_code,small_category_id,item_account_code,item_account_name,category_small:small_category_id(name,code)",
    company_code: `eq.${args.companyCode}`,
    order: "small_category_id.asc",
    limit: String(MAPPING_PAGE_SIZE),
    offset: String(args.page * MAPPING_PAGE_SIZE),
  };
  if (args.unmappedOnly) params.item_account_code = "is.null";

  const accessToken =
    (() => {
      try {
        const k = Object.keys(window.localStorage).find((x) => /sb-.*-auth-token/.test(x));
        if (!k) return null;
        const raw = window.localStorage.getItem(k);
        return raw ? JSON.parse(raw)?.access_token ?? null : null;
      } catch {
        return null;
      }
    })() ?? (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string);

  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/erp_company_category_defaults`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url.toString(), {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
      Authorization: `Bearer ${accessToken}`,
      Prefer: "count=exact",
    },
  });
  if (!r.ok) throw new Error(`mappings fetch → ${r.status}: ${await r.text()}`);
  const cr = r.headers.get("content-range"); // "0-29/2409"
  const total = cr ? parseInt(cr.split("/")[1], 10) || 0 : 0;
  const rows = (await r.json()) as MappingRow[];
  return { rows, total };
}

// ============================================================
// 작은 셀 컴포넌트
// ============================================================
const CodeChip = ({ value }: { value: string | null }) => (value ? <span className="code-chip">{value}</span> : null);
const DescCell = ({ value }: { value: string | null }) =>
  value ? <span style={{ color: "#64748b", fontSize: 13 }}>{value}</span> : <span style={{ color: "#cbd5e1" }}>—</span>;

type Tab = "systems" | "mapping";

// ============================================================
// 메인
// ============================================================
export function ERPAdminPage() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("systems");

  if (!isAdmin) {
    return (
      <section className="page-card" style={{ marginBottom: 0 }}>
        <style>{PAGE_STYLES}</style>
        <div className="page-h">
          <div>
            <h1>
              배포 ERP 관리
              <span className="text-xs text-gray-500 font-normal ml-2">/ admin/erp</span>
            </h1>
            <div className="meta">관리자 전용 페이지</div>
          </div>
        </div>
        <div className="callout-danger">
          <strong>접근 권한 없음</strong>
          <p style={{ margin: "4px 0 0" }}>이 페이지는 관리자(admin)만 볼 수 있습니다.</p>
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
            배포 ERP 관리<span className="text-xs text-gray-500 font-normal ml-2">/ admin/erp</span>
          </h1>
          <div className="meta">배포 대상 ERP 시스템 + 법인별 품목계정 매핑 (IF_B_ITEM 송신 기준)</div>
        </div>
      </div>

      <div className="callout-info">
        💡 <strong>target_erp_systems</strong> 활성 회사로만 IF_B_ITEM 송신. 소분류별 미매핑은{" "}
        <strong>erp_company_category_defaults</strong>에서 기본값 lookup, 없으면 NULL.
      </div>

      <div className="tabs">
        <button className={tab === "systems" ? "on" : ""} onClick={() => setTab("systems")}>
          ERP 시스템
        </button>
        <button className={tab === "mapping" ? "on" : ""} onClick={() => setTab("mapping")}>
          법인별 계정 매핑
        </button>
      </div>

      {tab === "systems" ? <SystemsTab /> : <MappingTab />}
    </section>
  );
}

// ============================================================
// 탭 1 — ERP 시스템 (AG-Grid + 추가/수정 다이얼로그 + 활성 토글)
// ============================================================
function SystemsTab() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const apiRef = useRef<GridApi | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ERPSystem | null>(null);
  const [form, setForm] = useState({ code: "", name: "", description: "", is_active: true, sort_order: 0 });
  const [err, setErr] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["v2-erp-systems"],
    queryFn: fetchErpSystems,
    staleTime: 30_000,
  });

  const toggleMut = useMutation({
    mutationFn: (erp: ERPSystem) =>
      rest("PATCH", "target_erp_systems", {
        params: { id: `eq.${erp.id}` },
        body: { is_active: !erp.is_active },
        prefer: "return=representation",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["v2-erp-systems"] }),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const body = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_active: form.is_active,
        sort_order: form.sort_order,
      };
      if (editing) {
        return rest("PATCH", "target_erp_systems", {
          params: { id: `eq.${editing.id}` },
          body,
          prefer: "return=representation",
        });
      }
      return rest("POST", "target_erp_systems", { body, prefer: "return=representation" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v2-erp-systems"] });
      setDialogOpen(false);
    },
    onError: (e: unknown) => setErr((e as Error).message),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ code: "", name: "", description: "", is_active: true, sort_order: rows.length + 1 });
    setErr(null);
    setDialogOpen(true);
  };
  const openEdit = (erp: ERPSystem) => {
    setEditing(erp);
    setForm({
      code: erp.code,
      name: erp.name,
      description: erp.description ?? "",
      is_active: erp.is_active,
      sort_order: erp.sort_order ?? 0,
    });
    setErr(null);
    setDialogOpen(true);
  };
  const submit = () => {
    if (!form.code.trim() || !form.name.trim()) {
      setErr("코드와 이름은 필수입니다.");
      return;
    }
    setErr(null);
    saveMut.mutate();
  };

  const ToggleCell = (p: ICellRendererParams<ERPSystem>) => {
    const erp = p.data!;
    return (
      <button
        className="toggle-btn"
        onClick={() => toggleMut.mutate(erp)}
        disabled={toggleMut.isPending}
        title="활성/비활성 전환"
      >
        <span className={`toggle ${erp.is_active ? "on" : ""}`}>
          <span className="sw" />
        </span>
        <span className={`badge-status ${erp.is_active ? "active" : "inactive"}`}>{erp.is_active ? "활성" : "비활성"}</span>
      </button>
    );
  };

  const EditCell = (p: ICellRendererParams<ERPSystem>) => (
    <div className="row-acts">
      <button className="ic-btn" onClick={() => openEdit(p.data!)} title="수정">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
    </div>
  );

  const cols = useMemo<ColDef<ERPSystem>[]>(
    () => [
      { headerName: "순서", field: "sort_order", width: 80 },
      {
        headerName: "코드",
        field: "code",
        width: 110,
        cellRenderer: (p: ICellRendererParams<ERPSystem>) => <CodeChip value={p.value} />,
      },
      { headerName: "이름", field: "name", width: 180, cellStyle: { fontWeight: 600 } as never },
      {
        headerName: "설명",
        field: "description",
        flex: 1,
        cellRenderer: (p: ICellRendererParams<ERPSystem>) => <DescCell value={p.value} />,
      },
      {
        headerName: "상태",
        field: "is_active",
        width: 150,
        cellRenderer: ToggleCell,
        filterValueGetter: (p) => (p.data?.is_active ? "활성" : "비활성"),
        cellStyle: { display: "flex", alignItems: "center" } as never,
      },
      {
        headerName: "관리",
        width: 90,
        cellRenderer: EditCell,
        sortable: false,
        filter: false,
        cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as never,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toggleMut.isPending],
  );

  const onReady = (e: GridReadyEvent) => {
    apiRef.current = e.api;
    e.api.sizeColumnsToFit();
  };

  return (
    <>
      <div className="erp-toolbar">
        <div className="search-box">
          <svg className="ic-search" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" placeholder="ERP 코드 · 이름 검색…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="t-meta">
          전체 <strong className="t-navy">{rows.length}개</strong>
        </span>
        <span style={{ flex: 1 }} />
        <button className="btn-primary" onClick={openAdd}>
          + ERP 추가
        </button>
      </div>

      <div className="ag-theme-quartz" style={{ height: 480 }}>
        <AgGridReact<ERPSystem>
          rowData={rows}
          columnDefs={cols}
          quickFilterText={q}
          onGridReady={onReady}
          rowHeight={48}
          headerHeight={36}
          suppressCellFocus
          loading={isLoading}
          defaultColDef={{ sortable: true, resizable: true, filter: "agTextColumnFilter" }}
          pagination
          paginationPageSize={50}
          paginationPageSizeSelector={[25, 50, 100]}
        />
      </div>

      {dialogOpen && (
        <div className="dlg-backdrop" onClick={() => setDialogOpen(false)}>
          <div className="dlg" onClick={(e) => e.stopPropagation()}>
            <div className="dlg-h">{editing ? "ERP 시스템 수정" : "ERP 시스템 추가"}</div>
            <div className="dlg-body">
              <div className="fld">
                <label>코드 *</label>
                <input
                  className="mono"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="SPI"
                />
              </div>
              <div className="fld">
                <label>이름 *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="삼표산업" />
              </div>
              <div className="fld">
                <label>설명</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="삼표산업 ERP 시스템"
                />
              </div>
              <div className="fld-row">
                <div className="fld" style={{ width: 120 }}>
                  <label>정렬 순서</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))}
                  />
                </div>
                <label className="chk">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  />
                  활성화 (송신 대상)
                </label>
              </div>
              {err && <div className="dlg-err">{err}</div>}
            </div>
            <div className="dlg-foot">
              <button className="btn-sec" onClick={() => setDialogOpen(false)} disabled={saveMut.isPending}>
                취소
              </button>
              <button className="btn-primary" onClick={submit} disabled={saveMut.isPending}>
                {saveMut.isPending ? "저장 중…" : editing ? "수정" : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// 탭 2 — 법인별 계정 매핑
// ============================================================
function MappingTab() {
  const qc = useQueryClient();
  const [selectedCo, setSelectedCo] = useState<string>("");
  const [unmappedOnly, setUnmappedOnly] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: stats = [] } = useQuery({
    queryKey: ["v2-erp-mapping-stats"],
    queryFn: fetchMappingStats,
    staleTime: 30_000,
  });

  // 통계 로드 후 기본 회사 선택 (미매핑 최다)
  const effectiveCo = useMemo(() => {
    if (selectedCo) return selectedCo;
    if (stats.length === 0) return "";
    return [...stats].sort((a, b) => b.unmapped_count - a.unmapped_count)[0].company_code;
  }, [selectedCo, stats]);

  const { data: accounts = [] } = useQuery({
    queryKey: ["v2-erp-accounts", effectiveCo],
    queryFn: () => fetchAccounts(effectiveCo),
    enabled: !!effectiveCo,
    staleTime: 60_000,
  });

  const { data: mapData, isLoading } = useQuery({
    queryKey: ["v2-erp-mappings", effectiveCo, unmappedOnly, page],
    queryFn: () => fetchMappings({ companyCode: effectiveCo, unmappedOnly, page }),
    enabled: !!effectiveCo,
    staleTime: 10_000,
  });

  const saveMut = useMutation({
    mutationFn: (args: { id: string; accountCode: string }) => {
      const name = accounts.find((a) => a.account_code === args.accountCode)?.account_name ?? "";
      return rest("PATCH", "erp_company_category_defaults", {
        params: { id: `eq.${args.id}` },
        body: { item_account_code: args.accountCode, item_account_name: name },
        prefer: "return=representation",
      });
    },
    onSuccess: () => {
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["v2-erp-mappings"] });
      qc.invalidateQueries({ queryKey: ["v2-erp-mapping-stats"] });
    },
  });

  const selectCo = (code: string) => {
    setSelectedCo(code);
    setPage(0);
    setEditingId(null);
  };

  const rows = mapData?.rows ?? [];
  const total = mapData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / MAPPING_PAGE_SIZE));

  // 소분류명 검색은 서버 조인 필터 제한 → 현재 페이지 클라이언트 필터
  const visibleRows = useMemo(() => {
    if (!q.trim()) return rows;
    const t = q.toLowerCase();
    return rows.filter(
      (m) =>
        m.category_small?.name?.toLowerCase().includes(t) || m.category_small?.code?.toLowerCase().includes(t),
    );
  }, [rows, q]);

  const cur = stats.find((s) => s.company_code === effectiveCo);

  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
        📍 회사 선택 (소분류별 계정 매핑 보기)
      </div>
      <div className="co-grid">
        {stats.map((s) => {
          const pct = s.total_categories > 0 ? Math.round((s.mapped_count / s.total_categories) * 100) : 0;
          return (
            <button
              key={s.company_code}
              className={`co-btn ${s.company_code === effectiveCo ? "on" : ""}`}
              onClick={() => selectCo(s.company_code)}
            >
              <div className="co-name">{s.company_code}</div>
              <div className="co-meta">
                {s.mapped_count}/{s.total_categories} · {pct}%
              </div>
              {s.unmapped_count > 0 && <div className="co-warn">⚠ 미매핑 {s.unmapped_count}</div>}
            </button>
          );
        })}
        {stats.length === 0 && <span className="t-meta">통계 불러오는 중…</span>}
      </div>

      {effectiveCo && (
        <>
          <div className="erp-toolbar">
            <div className="search-box">
              <svg className="ic-search" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="소분류명 · 코드 검색 (현재 페이지)…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select
              value={unmappedOnly ? "unmapped" : "all"}
              onChange={(e) => {
                setUnmappedOnly(e.target.value === "unmapped");
                setPage(0);
              }}
            >
              <option value="unmapped">미매핑만</option>
              <option value="all">전체 표시</option>
            </select>
            <span className="t-meta">
              {effectiveCo}: 매핑 {cur?.mapped_count ?? "-"} / 미매핑{" "}
              <span style={{ color: "#b45309", fontWeight: 700 }}>{cur?.unmapped_count ?? "-"}</span>
            </span>
          </div>

          <div className="tbl-wrap">
            <table className="map-tbl">
              <thead>
                <tr>
                  <th className="w-code">소분류 코드</th>
                  <th>소분류명</th>
                  <th className="w-acc">품목계정 매핑</th>
                  <th className="w-edit">편집</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="empty">
                      불러오는 중…
                    </td>
                  </tr>
                ) : visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty">
                      {unmappedOnly ? "미매핑 항목이 없습니다" : "항목이 없습니다"}
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <CodeChip value={m.category_small?.code ?? null} />
                      </td>
                      <td style={{ fontWeight: 600 }}>{m.category_small?.name ?? "-"}</td>
                      <td>
                        {editingId === m.id ? (
                          <select
                            className="acc-select"
                            autoFocus
                            value={m.item_account_code ?? ""}
                            disabled={saveMut.isPending}
                            onChange={(e) => saveMut.mutate({ id: m.id, accountCode: e.target.value })}
                          >
                            <option value="" disabled>
                              계정 선택…
                            </option>
                            {accounts.map((a) => (
                              <option key={a.account_code} value={a.account_code}>
                                {a.account_code} — {a.account_name}
                              </option>
                            ))}
                          </select>
                        ) : m.item_account_code ? (
                          <span className="account-cell">
                            <span className="code-chip">{m.item_account_code}</span>
                            <span className="ac-name">{m.item_account_name}</span>
                          </span>
                        ) : (
                          <span className="unmapped-warn">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                            </svg>
                            미매핑
                          </span>
                        )}
                      </td>
                      <td>
                        {editingId === m.id ? (
                          <button
                            className="btn-sec sm"
                            onClick={() => setEditingId(null)}
                            disabled={saveMut.isPending}
                          >
                            {saveMut.isPending ? "저장 중…" : "취소"}
                          </button>
                        ) : (
                          <button className="ic-btn" onClick={() => setEditingId(m.id)} title="계정 선택">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pager">
            <span className="t-meta">
              전체 {total.toLocaleString()}건 · {page + 1} / {totalPages} 페이지
            </span>
            <span style={{ flex: 1 }} />
            <button className="btn-sec sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              이전
            </button>
            <button
              className="btn-sec sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              다음
            </button>
          </div>
        </>
      )}
    </>
  );
}

const PAGE_STYLES = `
.callout-info { background: #eff6ff; border-left: 3px solid #003876; padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #1e293b; margin-top: 16px; }
.callout-danger { background: #fef2f2; border-left: 3px solid #dc2626; padding: 12px 14px; border-radius: 6px; font-size: 13px; color: #7f1d1d; margin-top: 16px; }

.tabs { display: inline-flex; background: #f1f5f9; border-radius: 8px; padding: 4px; margin: 18px 0 14px 0; }
.tabs button { padding: 8px 18px; border: none; background: transparent; cursor: pointer; font-size: 14px; font-weight: 500; color: #64748b; border-radius: 6px; }
.tabs button.on { background: #fff; color: #003876; font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }

.erp-toolbar { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 12px; }
.erp-toolbar .search-box { position: relative; flex: 1; max-width: 380px; }
.erp-toolbar .search-box input { width: 100%; padding: 8px 12px 8px 34px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: #1f2937; }
.erp-toolbar .search-box .ic-search { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #94a3b8; }
.erp-toolbar select { padding: 7px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #475569; background: #fff; }

.btn-primary { background: #003876; color: #fff; border: 1px solid #003876; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-primary:hover { background: #002a5c; }
.btn-primary:disabled { opacity: 0.6; cursor: default; }
.btn-sec { background: #fff; color: #003876; border: 1px solid #cbd5e1; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-sec:hover { background: #eff6ff; border-color: #003876; }
.btn-sec:disabled { opacity: 0.5; cursor: default; }
.btn-sec.sm { padding: 5px 12px; font-size: 13px; }

.co-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; margin-bottom: 16px; }
.co-btn { background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; cursor: pointer; text-align: left; }
.co-btn:hover { border-color: #003876; background: #eff6ff; }
.co-btn.on { background: #003876; color: #fff; border-color: #003876; }
.co-btn .co-name { font-size: 13px; font-weight: 700; line-height: 1.2; font-family: ui-monospace, monospace; }
.co-btn .co-meta { font-size: 11px; color: #94a3b8; margin-top: 2px; }
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
.acc-select { width: 100%; max-width: 320px; padding: 5px 8px; border: 1px solid #003876; border-radius: 6px; font-size: 13px; color: #1f2937; background: #fff; }

.toggle-btn { display: inline-flex; align-items: center; gap: 8px; background: none; border: none; cursor: pointer; padding: 0; }
.toggle-btn:disabled { opacity: 0.6; cursor: default; }
.toggle { display: inline-flex; align-items: center; }
.toggle .sw { width: 32px; height: 18px; border-radius: 999px; background: #cbd5e1; position: relative; transition: background 0.15s; }
.toggle .sw::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: left 0.15s; }
.toggle.on .sw { background: #047857; }
.toggle.on .sw::after { left: 16px; }

.row-acts { display: flex; gap: 4px; justify-content: center; }
.ic-btn { width: 28px; height: 28px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; border-radius: 6px; color: #475569; display: inline-flex; align-items: center; justify-content: center; }
.ic-btn:hover { background: #eff6ff; color: #003876; border-color: #003876; }
.ic-btn svg { width: 14px; height: 14px; }

.t-meta { font-size: 13px; font-weight: 500; color: #64748b; }
.t-navy { color: #003876 !important; }

.tbl-wrap { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #fff; }
.map-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.map-tbl thead th { text-align: left; padding: 10px 14px; background: #f8fafc; color: #003876; font-weight: 700; font-size: 12px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.map-tbl td { padding: 8px 14px; border-top: 1px solid #f1f5f9; vertical-align: middle; }
.map-tbl tr:hover td { background: #fafbfc; }
.map-tbl .w-code { width: 120px; }
.map-tbl .w-acc { width: 360px; }
.map-tbl .w-edit { width: 90px; }
.map-tbl .empty { text-align: center; color: #94a3b8; padding: 40px 0; }

.pager { display: flex; align-items: center; gap: 8px; margin-top: 12px; }

.dlg-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center; z-index: 50; }
.dlg { background: #fff; border-radius: 12px; width: 440px; max-width: 92vw; box-shadow: 0 20px 50px rgba(0,0,0,0.25); }
.dlg-h { padding: 18px 22px; font-size: 16px; font-weight: 700; color: #003876; border-bottom: 1px solid #e2e8f0; }
.dlg-body { padding: 18px 22px; display: flex; flex-direction: column; gap: 14px; }
.dlg .fld { display: flex; flex-direction: column; gap: 6px; }
.dlg .fld label, .dlg .chk { font-size: 13px; font-weight: 600; color: #475569; }
.dlg .fld input { padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: #1f2937; }
.dlg .fld input.mono { font-family: ui-monospace, monospace; }
.dlg .fld-row { display: flex; align-items: flex-end; gap: 16px; }
.dlg .chk { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.dlg .chk input { width: 16px; height: 16px; }
.dlg-err { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; font-size: 13px; padding: 8px 10px; border-radius: 6px; }
.dlg-foot { padding: 14px 22px; display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid #e2e8f0; }
`;
