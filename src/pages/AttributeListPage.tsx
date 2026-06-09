import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef, type GridApi, type GridReadyEvent, type ICellRendererParams } from "ag-grid-community";
import { rest, rpc } from "../lib/supabase";
import { GridPager } from "../components/common/GridPager";
import { useAuth } from "../contexts/AuthContext";

ModuleRegistry.registerModules([AllCommunityModule]);

type AttrRow = { id: string; code: string; name: string; data_type: string; unit: string | null; is_active: boolean; description: string | null };
type Attr = { id: string; code: string; name: string; data_type: string; unit: string | null; usage: number; is_active: boolean; description: string };
type UnitOpt = { code: string; name: string };

const DATA_TYPE_OPTIONS = [
  { value: "text", label: "텍스트" },
  { value: "number", label: "숫자" },
  { value: "select", label: "선택" },
  { value: "date", label: "날짜" },
  { value: "boolean", label: "예/아니오" },
] as const;

type AttrForm = { code: string; name: string; data_type: string; unit: string; description: string; is_active: boolean };
const EMPTY_FORM: AttrForm = { code: "", name: "", data_type: "text", unit: "", description: "", is_active: true };

const TypeBadge = ({ value }: { value: string }) => {
  const labels: Record<string, string> = { text: "텍스트", number: "숫자", select: "선택", boolean: "T/F", date: "날짜" };
  return <span className={`badge-type ${value}`}>{labels[value] ?? value}</span>;
};
const UsageCell = ({ value, max }: { value: number; max: number }) => {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span className="t-mono t-meta" style={{ minWidth: 36 }}>{value}</span>
      <div className="usage-bar"><div className="fill" style={{ width: `${pct}%` }}></div></div>
    </div>
  );
};
const StatusBadge = ({ on }: { on: boolean }) => (
  <span className={`badge-status ${on ? "active" : "inactive"}`}>{on ? "사용" : "미사용"}</span>
);
const CodeChip = ({ value }: { value: string }) => <span className="t-mono attr-code">{value}</span>;

type Filter = "all" | "active" | "inactive";

export function AttributeListPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  // 다이얼로그 상태
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AttrForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Attr | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["v2-attributes"],
    queryFn: async () => {
      const [attrs, usage] = await Promise.all([
        rest<AttrRow[]>("GET", "attributes", { params: { select: "id,code,name,data_type,unit,is_active,description", order: "name.asc", limit: "2000" } }),
        rpc<Record<string, number>>("get_attribute_usage_counts"),
      ]);
      return attrs.map<Attr>((a) => ({
        id: a.id, code: a.code, name: a.name, data_type: a.data_type, unit: a.unit,
        is_active: a.is_active, description: a.description ?? "",
        usage: usage[a.id] ?? 0,
      }));
    },
    staleTime: 60_000,
  });

  // 단위 후보 (속성용/공통, 활성) — datalist용
  const { data: unitOpts = [] } = useQuery({
    queryKey: ["v2-attr-units"],
    queryFn: () => rest<UnitOpt[]>("GET", "units", {
      params: { select: "code,name", unit_type: "in.(attribute,both,common)", is_active: "eq.true", order: "sort_order.asc", limit: "500" },
    }),
    staleTime: 300_000,
    enabled: isAdmin,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["v2-attributes"] });

  // ── 쓰기: 추가/수정 ────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: async (vars: { id: string | null; body: Record<string, unknown> }) => {
      if (vars.id) {
        await rest("PATCH", "attributes", { params: { id: `eq.${vars.id}` }, body: vars.body, prefer: "return=representation" });
      } else {
        await rest("POST", "attributes", { body: vars.body, prefer: "return=representation" });
      }
    },
    onSuccess: () => { invalidate(); setFormOpen(false); },
    onError: (e: unknown) => {
      const msg = (e as Error).message;
      alert(msg.includes("23505") ? "이미 등록된 속성 코드입니다." : `저장 실패: ${msg}`);
    },
  });

  // ── 쓰기: 삭제 ─────────────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await rest("DELETE", "attributes", { params: { id: `eq.${id}` } }); },
    onSuccess: () => { invalidate(); setDeleteTarget(null); },
    onError: (e: unknown) => alert(`삭제 실패: ${(e as Error).message}\n\n분류에 매핑되었거나 품목이 참조 중이면 삭제할 수 없습니다. 대신 '미사용'으로 변경하세요.`),
  });

  // ── 핸들러 ─────────────────────────────────────────────────────────
  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }, []);

  const submitForm = () => {
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    if (!code || !name) { alert("속성코드와 속성명은 필수입니다."); return; }
    saveMut.mutate({
      id: editingId,
      body: {
        code, name, data_type: form.data_type,
        unit: form.unit.trim() || null,
        description: form.description.trim() || null,
        is_active: form.is_active,
      },
    });
  };

  const ActionsCell = useCallback((p: ICellRendererParams<Attr>) => {
    const a = p.data;
    if (!a) return null;
    return (
      <div className="row-acts">
        <button
          className="ic-btn"
          title="수정"
          onClick={() => {
            setEditingId(a.id);
            setForm({ code: a.code, name: a.name, data_type: a.data_type, unit: a.unit ?? "", description: a.description, is_active: a.is_active });
            setFormOpen(true);
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
        </button>
        <button className="ic-btn del" title="삭제" onClick={() => setDeleteTarget(a)}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1.5 14a2 2 0 0 1-2 2H8.5a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxUsage = useMemo(() => rows.reduce((m, r) => Math.max(m, r.usage), 0), [rows]);

  const columnDefs = useMemo<ColDef<Attr>[]>(() => {
    const base: ColDef<Attr>[] = [
      { headerName: "속성 코드", field: "code", width: 130, cellRenderer: (p: ICellRendererParams<Attr>) => <CodeChip value={p.value} /> },
      { headerName: "속성명", field: "name", width: 150, cellStyle: { fontWeight: 600 } as any },
      { headerName: "데이터 타입", field: "data_type", width: 110, cellRenderer: (p: ICellRendererParams<Attr>) => <TypeBadge value={p.value} /> },
      { headerName: "단위", field: "unit", width: 80, cellClass: "t-mono", valueFormatter: (p) => p.value || "—" },
      { headerName: "사용 빈도 (매핑 소분류)", field: "usage", width: 200, cellRenderer: (p: ICellRendererParams<Attr>) => <UsageCell value={p.value} max={maxUsage} />, sort: "desc" },
      { headerName: "상태", field: "is_active", width: 80, cellRenderer: (p: ICellRendererParams<Attr>) => <StatusBadge on={p.value} />, filterValueGetter: (p) => p.data?.is_active ? "사용" : "미사용" },
      { headerName: "설명", field: "description", width: 300, cellStyle: { color: "#64748b", fontSize: "13px" } as any },
    ];
    if (isAdmin) {
      base.push({ headerName: "관리", colId: "actions", width: 90, cellRenderer: ActionsCell, sortable: false, filter: false, cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any });
    }
    return base;
  }, [maxUsage, isAdmin, ActionsCell]);

  const onGridReady = useCallback((e: GridReadyEvent) => { e.api.sizeColumnsToFit(); setGridApi(e.api); }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter(a => filter === "active" ? a.is_active : !a.is_active);
  }, [filter, rows]);

  const counts = useMemo(() => ({
    all: rows.length,
    active: rows.filter(r => r.is_active).length,
    inactive: rows.filter(r => !r.is_active).length,
  }), [rows]);

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>속성 목록<span className="text-xs text-gray-500 font-normal ml-2">/ attribute/list</span></h1>
          <div className="meta">{counts.all}개 속성 마스터 — 카탈로그 분류별 매핑에 사용{isLoading && " · 불러오는 중…"}</div>
        </div>
        <div className="actions">
          {isAdmin && <button className="btn-primary" onClick={openAdd}>＋ 속성 추가</button>}
        </div>
      </div>

      <div className="attr-toolbar">
        <div className="search-box">
          <svg className="ic-search" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="속성명 · 코드 검색…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-tags">
          <button className={`filter-tag ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>전체 {counts.all}</button>
          <button className={`filter-tag ${filter === "active" ? "on" : ""}`} onClick={() => setFilter("active")}>사용 중 {counts.active}</button>
          <button className={`filter-tag ${filter === "inactive" ? "on" : ""}`} onClick={() => setFilter("inactive")}>미사용 {counts.inactive}</button>
        </div>
        <span style={{ flex: 1 }}></span>
        <span className="t-meta">총 <strong className="t-navy">{counts.all}건</strong></span>
        <GridPager api={gridApi} pageSizeOptions={[25, 50, 100]} />
      </div>

      <div className="ag-theme-quartz" style={{ height: 560 }}>
        <AgGridReact<Attr>
          rowData={filtered}
          columnDefs={columnDefs}
          rowHeight={48} headerHeight={36}
          suppressCellFocus suppressMenuHide
          defaultColDef={{ sortable: true, resizable: true, filter: "agTextColumnFilter", menuTabs: ["filterMenuTab", "generalMenuTab"] }}
          pagination paginationPageSize={50} suppressPaginationPanel
          quickFilterText={search}
          onGridReady={onGridReady}
        />
      </div>

      {/* Dialog: 추가 / 수정 */}
      {formOpen && (
        <div className="dialog-overlay" onClick={() => setFormOpen(false)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-head">
              <h3>{editingId ? "속성 수정" : "속성 추가"}</h3>
              <button className="close" onClick={() => setFormOpen(false)}>×</button>
            </div>
            <div className="dialog-body">
              <div className="form-grid2">
                <div className="form-row">
                  <label>속성코드 *</label>
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="예: CAPACITY" />
                </div>
                <div className="form-row">
                  <label>속성명 *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 용량" />
                </div>
              </div>
              <div className="form-grid2">
                <div className="form-row">
                  <label>데이터 타입 *</label>
                  <select value={form.data_type} onChange={(e) => setForm({ ...form, data_type: e.target.value })}>
                    {DATA_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <label>단위</label>
                  <input list="attr-unit-list" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="예: mm, kg (선택)" />
                  <datalist id="attr-unit-list">
                    {unitOpts.map((u) => <option key={u.code} value={u.code}>{u.name}</option>)}
                  </datalist>
                </div>
              </div>
              <div className="form-row">
                <label>설명</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="속성에 대한 설명" rows={2} />
              </div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <label>사용여부</label>
                <label className="switch-row">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                  <span>{form.is_active ? "사용" : "미사용"}</span>
                </label>
              </div>
            </div>
            <div className="dialog-foot">
              <button className="btn-sec" onClick={() => setFormOpen(false)}>취소</button>
              <button className="btn-primary" onClick={submitForm} disabled={saveMut.isPending}>
                {saveMut.isPending ? "저장 중…" : editingId ? "저장" : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: 삭제 confirm */}
      {deleteTarget && (
        <div className="dialog-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-head">
              <h3>속성 삭제</h3>
              <button className="close" onClick={() => setDeleteTarget(null)}>×</button>
            </div>
            <div className="dialog-body">
              <p className="del-msg">
                <strong>{deleteTarget.name}</strong> (<span className="t-mono">{deleteTarget.code}</span>) 속성을 삭제하시겠습니까?
                {deleteTarget.usage > 0 && (
                  <><br /><span style={{ color: "#b91c1c" }}>⚠️ 이 속성이 {deleteTarget.usage}개 소분류에 매핑되어 있습니다. 삭제가 거부될 수 있습니다 — '미사용'을 권장합니다.</span></>
                )}
                <br />이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="dialog-foot">
              <button className="btn-sec" onClick={() => setDeleteTarget(null)}>취소</button>
              <button className="btn-danger" onClick={() => deleteMut.mutate(deleteTarget.id)} disabled={deleteMut.isPending}>
                {deleteMut.isPending ? "삭제 중…" : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const PAGE_STYLES = `
.attr-toolbar { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin: 16px 0 12px 0; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.attr-toolbar .search-box { position: relative; flex: 1; max-width: 380px; }
.attr-toolbar .search-box input { width: 100%; padding: 8px 12px 8px 34px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: #1f2937; }
.attr-toolbar .search-box input:focus { outline: none; border-color: #003876; box-shadow: 0 0 0 2px rgba(0,56,118,0.1); }
.attr-toolbar .search-box .ic-search { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #94a3b8; }
.filter-tags { display: inline-flex; gap: 6px; }
.filter-tag { padding: 4px 10px; border: 1px solid #cbd5e1; background: #fff; border-radius: 999px; cursor: pointer; font-size: 12px; font-weight: 500; color: #475569; }
.filter-tag:hover { background: #eff6ff; border-color: #003876; color: #003876; }
.filter-tag.on { background: #003876; color: #fff; border-color: #003876; }

.btn-primary { background: #003876; color: #fff; border: 1px solid #003876; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-primary:hover { background: #002a5c; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-sec { background: #fff; color: #003876; border: 1px solid #cbd5e1; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-sec:hover { background: #eff6ff; border-color: #003876; }
.btn-danger { background: #b91c1c; color: #fff; border: 1px solid #b91c1c; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-danger:hover { background: #991b1b; }
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

.attr-code { color: #003876; font-weight: 600; font-size: 12px; padding: 1px 7px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; }

.badge-type { display: inline-block; padding: 1px 7px; border-radius: 4px; font-size: 11px; font-weight: 600; line-height: 1.5; }
.badge-type.text { background: #e0f2fe; color: #075985; border: 1px solid #bae6fd; }
.badge-type.number { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.badge-type.boolean { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }
.badge-type.select { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.badge-type.date { background: #fae8ff; color: #86198f; border: 1px solid #f5d0fe; }

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

.t-mono { font-family: ui-monospace, SFMono-Regular, monospace; }
.t-meta { font-size: 13px; font-weight: 500; color: #64748b; }
.t-navy { color: #003876 !important; }

.dialog-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog-box { background: #fff; border-radius: 10px; width: 480px; box-shadow: 0 20px 50px rgba(0,0,0,0.25); overflow: hidden; }
.dialog-head { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
.dialog-head h3 { font-size: 16px; font-weight: 700; color: #003876; margin: 0; }
.dialog-head .close { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 20px; }
.dialog-body { padding: 18px 20px; }
.form-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-row { margin-bottom: 14px; }
.form-row label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px; }
.form-row select, .form-row input, .form-row textarea { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; font-family: inherit; }
.form-row select:focus, .form-row input:focus, .form-row textarea:focus { outline: none; border-color: #003876; box-shadow: 0 0 0 2px rgba(0,56,118,0.1); }
.switch-row { display: flex; align-items: center; gap: 8px; padding-top: 6px; font-size: 14px; color: #1f2937; cursor: pointer; }
.switch-row input { width: 16px; height: 16px; accent-color: #003876; }
.del-msg { font-size: 14px; color: #1e293b; line-height: 1.6; }
.dialog-foot { padding: 12px 20px; border-top: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: flex-end; gap: 8px; }
`;
