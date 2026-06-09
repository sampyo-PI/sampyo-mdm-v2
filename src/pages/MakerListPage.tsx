import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef, type GridApi, type GridReadyEvent, type ICellRendererParams } from "ag-grid-community";
import { rest, rpc } from "../lib/supabase";
import { GridPager } from "../components/common/GridPager";
import { useAuth } from "../contexts/AuthContext";

ModuleRegistry.registerModules([AllCommunityModule]);

type MakerRow = { id: string; code: string; name: string; description: string | null; is_active: boolean };
type Maker = { id: string; code: string; name: string; description: string; usage: number; is_active: boolean };

type MakerForm = { code: string; name: string; description: string; is_active: boolean };
const EMPTY_FORM: MakerForm = { code: "", name: "", description: "", is_active: true };

const CodeChip = ({ value }: { value: string }) => <span className="maker-code">{value}</span>;
const UsageCell = ({ value, max }: { value: number; max: number }) => {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span className="t-mono t-meta" style={{ minWidth: 48 }}>{value.toLocaleString()}</span>
      <div className="usage-bar"><div className="fill" style={{ width: `${pct}%` }}></div></div>
    </div>
  );
};
const StatusBadge = ({ on }: { on: boolean }) => <span className={`badge-status ${on ? "active" : "inactive"}`}>{on ? "사용" : "미사용"}</span>;

type MergeState = "off" | "on";

async function fetchAllMakers(): Promise<MakerRow[]> {
  const out: MakerRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const chunk = await rest<MakerRow[]>("GET", "makers", {
      params: { select: "id,code,name,description,is_active", order: "name.asc", limit: "1000", offset: String(offset) },
    });
    out.push(...chunk);
    if (chunk.length < 1000) break;
  }
  return out;
}

const normalizeName = (s: string) => s.replace(/\s+/g, "").toUpperCase();

export function MakerListPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [mergeMode, setMergeMode] = useState<MergeState>("off");
  const [selected, setSelected] = useState<string[]>([]); // maker id 목록
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  // 다이얼로그 상태
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState<string>(""); // 수정 모드에서 코드 표시(읽기전용)
  const [form, setForm] = useState<MakerForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Maker | null>(null);
  const [mergeConfirm, setMergeConfirm] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);

  const { data: rows = [] } = useQuery({
    queryKey: ["v2-makers"],
    queryFn: async () => {
      const [makers, usage] = await Promise.all([fetchAllMakers(), rpc<Record<string, number>>("get_maker_usage_counts")]);
      return makers.map<Maker>((m) => ({
        id: m.id, code: m.code, name: m.name, description: m.description ?? "",
        is_active: m.is_active, usage: usage[m.name?.trim()] ?? 0,
      }));
    },
    staleTime: 60_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["v2-makers"] });

  // ── 쓰기: 추가/수정 ────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: async (vars: { id: string | null; body: Record<string, unknown> }) => {
      if (vars.id) {
        await rest("PATCH", "makers", { params: { id: `eq.${vars.id}` }, body: vars.body, prefer: "return=representation" });
      } else {
        await rest("POST", "makers", { body: vars.body, prefer: "return=representation" });
      }
    },
    onSuccess: () => { invalidate(); setFormOpen(false); },
    onError: (e: unknown) => {
      const msg = (e as Error).message;
      alert(msg.includes("23505") ? "이미 등록된 제조사 코드입니다." : `저장 실패: ${msg}`);
    },
  });

  // ── 쓰기: 삭제 ─────────────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await rest("DELETE", "makers", { params: { id: `eq.${id}` } }); },
    onSuccess: () => { invalidate(); setDeleteTarget(null); },
    onError: (e: unknown) => alert(`삭제 실패: ${(e as Error).message}\n\n참조하는 품목이 있으면 삭제 대신 병합 또는 '미사용'을 사용하세요.`),
  });

  // ── 쓰기: 병합 (v1 동등 — items.maker / item_requests.maker UPDATE + source makers DELETE) ──
  const mergeMut = useMutation({
    mutationFn: async (vars: { targetName: string; sources: Maker[] }) => {
      // source명별 개별 PATCH (in-list 인코딩 함정 회피, 선택 수 적음)
      for (const s of vars.sources) {
        if (s.name === vars.targetName) continue;
        await rest("PATCH", "items", { params: { maker: `eq.${s.name}` }, body: { maker: vars.targetName } });
        await rest("PATCH", "item_requests", { params: { maker: `eq.${s.name}` }, body: { maker: vars.targetName } });
      }
      const srcIds = vars.sources.map((s) => s.id).filter((id) => id !== mergeTargetId);
      for (const id of srcIds) {
        await rest("DELETE", "makers", { params: { id: `eq.${id}` } });
      }
    },
    onSuccess: () => {
      invalidate();
      setMergeConfirm(false);
      setMergeMode("off");
      setSelected([]);
      setMergeTargetId(null);
    },
    onError: (e: unknown) => alert(`병합 실패: ${(e as Error).message}`),
  });

  // ── 핸들러 ─────────────────────────────────────────────────────────
  const openAdd = useCallback(() => {
    setEditingId(null);
    setEditingCode("");
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }, []);

  const submitForm = () => {
    const name = form.name.trim();
    if (!name) { alert("제조사명은 필수입니다."); return; }
    if (name.length < 2) { alert("제조사명은 2자 이상이어야 합니다."); return; }

    if (!editingId) {
      // 신규: 유사명 dedup
      const norm = normalizeName(name);
      const similar = rows.find((m) => normalizeName(m.name) === norm);
      if (similar) {
        alert(`유사한 제조사가 이미 있습니다: "${similar.name}" (${similar.usage.toLocaleString()}건 사용)`);
        return;
      }
      const code = form.code.trim().toUpperCase();
      if (code && !/^[A-Z]{1,5}$/.test(code)) {
        alert("코드는 영문 대문자 1~5자로 입력해주세요. (비우면 자동생성)");
        return;
      }
      const body: Record<string, unknown> = {
        name, description: form.description.trim() || null, is_active: form.is_active,
      };
      if (code) body.code = code; // 비우면 omit → DB 자동생성
      saveMut.mutate({ id: null, body });
    } else {
      // 수정: name/description/is_active (code 불변 — v1 동일)
      saveMut.mutate({
        id: editingId,
        body: { name, description: form.description.trim() || null, is_active: form.is_active },
      });
    }
  };

  const startMerge = () => {
    if (selected.length < 2) { alert("병합할 제조사를 2개 이상 선택하세요."); return; }
    setMergeTargetId(selected[0]);
    setMergeConfirm(true);
  };

  const selectedMakers = useMemo(() => rows.filter((r) => selected.includes(r.id)), [rows, selected]);

  // 액션/선택 셀
  const ActionsCell = useCallback((p: ICellRendererParams<Maker>) => {
    const m = p.data;
    if (!m) return null;
    return (
      <div className="row-acts">
        <button
          className="ic-btn"
          title="수정"
          onClick={() => {
            setEditingId(m.id);
            setEditingCode(m.code);
            setForm({ code: m.code, name: m.name, description: m.description, is_active: m.is_active });
            setFormOpen(true);
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
        </button>
        <button className="ic-btn del" title="삭제" onClick={() => setDeleteTarget(m)}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1.5 14a2 2 0 0 1-2 2H8.5a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const SelectCell = useCallback((p: ICellRendererParams<Maker>) => {
    const m = p.data;
    if (!m) return null;
    return (
      <input
        type="checkbox"
        checked={selected.includes(m.id)}
        onChange={(e) => {
          if (e.target.checked) setSelected((s) => [...s, m.id]);
          else setSelected((s) => s.filter((x) => x !== m.id));
        }}
      />
    );
  }, [selected]);

  const maxUsage = useMemo(() => rows.reduce((m, r) => Math.max(m, r.usage), 0), [rows]);
  const activeCnt = useMemo(() => rows.filter(r => r.is_active).length, [rows]);
  const matchedCnt = useMemo(() => rows.filter(r => r.usage > 0).length, [rows]);
  const matchedItems = useMemo(() => rows.reduce((s, r) => s + r.usage, 0), [rows]);

  const columnDefs = useMemo<ColDef<Maker>[]>(() => {
    const base: ColDef<Maker>[] = [
      { headerName: "코드", field: "code", width: 130, cellRenderer: (p: ICellRendererParams<Maker>) => <CodeChip value={p.value} /> },
      { headerName: "제조사명", field: "name", width: 220, cellStyle: { fontWeight: 600 } as any },
      { headerName: "사용 빈도 (items)", field: "usage", width: 220, cellRenderer: (p: ICellRendererParams<Maker>) => <UsageCell value={p.value} max={maxUsage} />, sort: "desc" },
      { headerName: "상태", field: "is_active", width: 80, cellRenderer: (p: ICellRendererParams<Maker>) => <StatusBadge on={p.value} />, filterValueGetter: (p) => p.data?.is_active ? "사용" : "미사용" },
      { headerName: "설명", field: "description", width: 280, cellStyle: { color: "#64748b", fontSize: "13px" } as any },
    ];
    if (isAdmin) {
      base.push(
        mergeMode === "on"
          ? { headerName: "선택", colId: "sel", width: 80, cellRenderer: SelectCell, sortable: false, filter: false, cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any }
          : { headerName: "관리", colId: "actions", width: 90, cellRenderer: ActionsCell, sortable: false, filter: false, cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any }
      );
    }
    return base;
  }, [mergeMode, maxUsage, isAdmin, SelectCell, ActionsCell]);

  const onGridReady = useCallback((e: GridReadyEvent) => { e.api.sizeColumnsToFit(); setGridApi(e.api); }, []);

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>제조사 리스트</h1>
        </div>
        <div className="actions">
          {isAdmin && (mergeMode === "off" ? (
            <>
              <button className="btn-sec" onClick={() => { setMergeMode("on"); setSelected([]); }}>🔗 병합 모드</button>
              <button className="btn-primary" onClick={openAdd}>＋ 제조사 추가</button>
            </>
          ) : (
            <>
              <span className="t-meta">선택 <strong className="t-navy">{selected.length}개</strong></span>
              <button className="btn-sec" onClick={() => { setMergeMode("off"); setSelected([]); }}>취소</button>
              <button className="btn-primary" disabled={selected.length < 2} onClick={startMerge}>병합 실행 ({selected.length})</button>
            </>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3" style={{ marginTop: 16 }}>
        <div className="stat-card"><div className="stat-label">전체 제조사</div><div className="stat-val">{rows.length.toLocaleString()}</div><div className="stat-sub">사용 중 {activeCnt.toLocaleString()} · 미사용 {(rows.length - activeCnt).toLocaleString()}</div></div>
        <div className="stat-card"><div className="stat-label">items에서 사용 중</div><div className="stat-val">{matchedCnt.toLocaleString()}</div><div className="stat-sub">정확 일치 제조사 (free-text)</div></div>
        <div className="stat-card"><div className="stat-label">매칭 items 합계</div><div className="stat-val">{matchedItems.toLocaleString()}</div><div className="stat-sub">maker 보유 활성 items</div></div>
        <div className="stat-card"><div className="stat-label">미사용 마스터</div><div className="stat-val" style={{ color: "#b45309" }}>{(rows.length - matchedCnt).toLocaleString()}</div><div className="stat-sub">items 참조 0건 (정리 후보)</div></div>
      </div>

      {mergeMode === "on" && (
        <div className="callout-merge">
          🔗 <strong>병합 모드</strong> — 같은 제조사로 묶을 행 2개 이상 선택 후 "병합 실행". 다음 단계에서 통합 대상(base)을 고르면 나머지는 base로 흡수되고 참조 품목의 maker가 일괄 변경됩니다.
        </div>
      )}

      <div className="maker-toolbar">
        <div className="search-box">
          <svg className="ic-search" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="제조사명 · 코드 검색…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="t-meta" style={{ marginLeft: "auto" }}>전체 <strong className="t-navy">{rows.length.toLocaleString()}개</strong></span>
        <GridPager api={gridApi} pageSizeOptions={[25, 50, 100]} />
      </div>

      <div className="ag-theme-quartz" style={{ height: 540 }}>
        <AgGridReact<Maker>
          rowData={rows}
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
              <h3>{editingId ? "제조사 수정" : "제조사 추가"}</h3>
              <button className="close" onClick={() => setFormOpen(false)}>×</button>
            </div>
            <div className="dialog-body">
              <div className="form-row">
                <label>제조사명 *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 삼성전자" />
              </div>
              <div className="form-row">
                <label>코드 {editingId ? "(변경 불가)" : "(선택 — 비우면 자동생성)"}</label>
                <input
                  value={form.code}
                  disabled={!!editingId}
                  maxLength={5}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder={editingId ? editingCode : "영문 대문자 1~5자 (예: SS)"}
                />
              </div>
              <div className="form-row">
                <label>설명</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="제조사에 대한 설명" rows={3} />
              </div>
              <div className="form-row">
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
              <h3>제조사 삭제</h3>
              <button className="close" onClick={() => setDeleteTarget(null)}>×</button>
            </div>
            <div className="dialog-body">
              <p className="del-msg">
                <strong>{deleteTarget.name}</strong> (<span className="t-mono">{deleteTarget.code}</span>) 제조사를 삭제하시겠습니까?
                {deleteTarget.usage > 0 && (
                  <><br /><span style={{ color: "#b91c1c" }}>⚠️ 이 제조사를 사용하는 품목이 {deleteTarget.usage.toLocaleString()}건 있습니다. 삭제 대신 병합을 권장합니다.</span></>
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

      {/* Dialog: 병합 확인 (통합 대상 선택) */}
      {mergeConfirm && (
        <div className="dialog-overlay" onClick={() => !mergeMut.isPending && setMergeConfirm(false)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-head">
              <h3>제조사 병합</h3>
              <button className="close" onClick={() => !mergeMut.isPending && setMergeConfirm(false)}>×</button>
            </div>
            <div className="dialog-body">
              <p className="del-msg" style={{ marginBottom: 12 }}>
                선택한 {selectedMakers.length}개 제조사를 하나로 병합합니다. 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <label>통합 대상 (이 이름으로 통일됨)</label>
                <div className="merge-list">
                  {selectedMakers.map((m) => (
                    <label key={m.id} className="merge-opt">
                      <input type="radio" name="mergeTarget" checked={mergeTargetId === m.id} onChange={() => setMergeTargetId(m.id)} />
                      <span className="merge-name">{m.name}</span>
                      <span className="merge-usage">{m.usage.toLocaleString()}건</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="dialog-foot">
              <button className="btn-sec" onClick={() => setMergeConfirm(false)} disabled={mergeMut.isPending}>취소</button>
              <button
                className="btn-primary"
                disabled={mergeMut.isPending || !mergeTargetId}
                onClick={() => {
                  const target = selectedMakers.find((m) => m.id === mergeTargetId);
                  if (!target) return;
                  mergeMut.mutate({ targetName: target.name, sources: selectedMakers });
                }}
              >
                {mergeMut.isPending ? "병합 중…" : "병합 진행"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const PAGE_STYLES = `
.stat-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; }
.stat-card .stat-label { font-size: 14px; color: #64748b; }
.stat-card .stat-val { font-size: 30px; font-weight: 700; color: #003876; line-height: 1.1; margin-top: 6px; }
.stat-card .stat-sub { display: none; }

.callout-merge { background: #fef3c7; border-left: 3px solid #92400e; padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #78350f; margin-top: 16px; }

.maker-toolbar { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin: 16px 0 12px 0; display: flex; align-items: center; gap: 12px; }
.maker-toolbar .search-box { position: relative; flex: 1; max-width: 380px; }
.maker-toolbar .search-box input { width: 100%; padding: 8px 12px 8px 34px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: #1f2937; }
.maker-toolbar .search-box input:focus { outline: none; border-color: #003876; box-shadow: 0 0 0 2px rgba(0,56,118,0.1); }
.maker-toolbar .search-box .ic-search { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #94a3b8; }

.btn-primary { background: #003876; color: #fff; border: 1px solid #003876; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-primary:hover { background: #002a5c; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-sec { background: #fff; color: #003876; border: 1px solid #cbd5e1; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-sec:hover { background: #eff6ff; border-color: #003876; }
.btn-danger { background: #b91c1c; color: #fff; border: 1px solid #b91c1c; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-danger:hover { background: #991b1b; }
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

.maker-code { color: #003876; font-weight: 700; font-size: 12px; padding: 1px 8px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; font-family: ui-monospace, monospace; }

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

.dialog-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog-box { background: #fff; border-radius: 10px; width: 480px; box-shadow: 0 20px 50px rgba(0,0,0,0.25); overflow: hidden; }
.dialog-head { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
.dialog-head h3 { font-size: 16px; font-weight: 700; color: #003876; margin: 0; }
.dialog-head .close { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 20px; }
.dialog-body { padding: 18px 20px; }
.form-row { margin-bottom: 14px; }
.form-row label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px; }
.form-row select, .form-row input, .form-row textarea { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; font-family: inherit; }
.form-row select:focus, .form-row input:focus, .form-row textarea:focus { outline: none; border-color: #003876; box-shadow: 0 0 0 2px rgba(0,56,118,0.1); }
.form-row input:disabled { background: #f1f5f9; color: #94a3b8; }
.switch-row { display: flex; align-items: center; gap: 8px; padding-top: 6px; font-size: 14px; color: #1f2937; cursor: pointer; }
.switch-row input { width: 16px; height: 16px; accent-color: #003876; }
.del-msg { font-size: 14px; color: #1e293b; line-height: 1.6; }
.dialog-foot { padding: 12px 20px; border-top: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: flex-end; gap: 8px; }

.merge-list { display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow-y: auto; }
.merge-opt { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; }
.merge-opt:hover { background: #f8fafc; border-color: #cbd5e1; }
.merge-opt .merge-name { font-weight: 600; font-size: 14px; color: #1f2937; }
.merge-opt .merge-usage { margin-left: auto; font-size: 12px; color: #64748b; }
`;
