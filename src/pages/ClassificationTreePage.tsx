import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rest, restCount } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

type Cat = { id: string; code: string; name: string; en: string; description: string };
type SmallCat = Cat & { stock_unit: string; account: string; klass: string };

type LargeRow = { id: string; code: string; name: string; english_name: string | null; description: string | null };
type MediumRow = LargeRow & { large_category_id: string };
type SmallRow = LargeRow & { medium_category_id: string; default_stock_unit_code: string | null; default_item_account_code: string | null; default_item_class_code: string | null };

type Level = "large" | "medium" | "small";
const LEVEL_LABEL: Record<Level, string> = { large: "대분류", medium: "중분류", small: "소분류" };
const CODE_RULE: Record<Level, { re: RegExp; hint: string; max: number }> = {
  large: { re: /^[A-Z]$/, hint: "영문 대문자 1자리", max: 1 },
  medium: { re: /^[A-Z0-9]{2}$/, hint: "영문 대문자/숫자 2자리", max: 2 },
  small: { re: /^[A-Z0-9]{3}$/, hint: "영문 대문자/숫자 3자리", max: 3 },
};
const CAT_TABLE: Record<Level, string> = { large: "category_large", medium: "category_medium", small: "category_small" };

type FieldTerm = { id: string; term: string; description: string | null; is_active: boolean; sort_order: number };

const Panel = ({ title, count, items, selected, onSelect, parentLabel, search, setSearch, isAdmin, onAdd, addDisabled, onEdit }: {
  title: string; count: number; items: Cat[]; selected: string | null; onSelect: (id: string) => void;
  parentLabel?: string; search: string; setSearch: (s: string) => void;
  isAdmin: boolean; onAdd: () => void; addDisabled?: boolean; onEdit: (c: Cat) => void;
}) => (
  <div className="cat-panel">
    <div className="panel-h">
      <div className="h-title">
        {title} <span className="count">{count}</span>
        {parentLabel && <span className="t-mini t-slate" style={{ marginLeft: 6, fontWeight: 500 }}>/ {parentLabel}</span>}
      </div>
      {isAdmin && <button className="btn-add" onClick={onAdd} disabled={addDisabled} title={addDisabled ? "상위 분류를 먼저 선택하세요" : ""}>＋ 추가</button>}
    </div>
    <div className="panel-search">
      <input type="search" placeholder={`${title} 검색`} value={search} onChange={(e) => setSearch(e.target.value)} />
    </div>
    <div className="panel-list">
      {items.length === 0 ? (
        <div className="empty">{parentLabel ? `${parentLabel}에 등록된 ${title} 없음` : "검색 결과 없음"}</div>
      ) : (
        items.filter(c => !search || c.name.includes(search) || c.code.toLowerCase().includes(search.toLowerCase()) || (c.en || "").toLowerCase().includes(search.toLowerCase())).map(c => (
          <div key={c.id} className={`cat-row ${selected === c.id ? "selected" : ""}`} onClick={() => onSelect(c.id)}>
            <div className="cat-main">
              <div className="cat-name">{c.name}</div>
              <div className="cat-meta">
                <span className="cat-code">{c.code}</span>
                <span className="cat-en">{c.en}</span>
              </div>
            </div>
            {isAdmin && (
              <div className="row-acts">
                <button title="편집" onClick={(e) => { e.stopPropagation(); onEdit(c); }}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg></button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  </div>
);

export function ClassificationTreePage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [selL, setSelL] = useState<string | null>(null);
  const [selM, setSelM] = useState<string | null>(null);
  const [selS, setSelS] = useState<string | null>(null);
  const [qL, setQL] = useState("");
  const [qM, setQM] = useState("");
  const [qS, setQS] = useState("");

  // 분류 추가/수정 다이얼로그
  const [catDialog, setCatDialog] = useState<{ open: boolean; level: Level; mode: "add" | "edit"; parentId?: string; id?: string }>({ open: false, level: "large", mode: "add" });
  const [catForm, setCatForm] = useState({ name: "", code: "", description: "" });
  // 현장용어 다이얼로그
  const [termDialog, setTermDialog] = useState(false);
  const [editingTerm, setEditingTerm] = useState<FieldTerm | null>(null);
  const [termForm, setTermForm] = useState({ term: "", description: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["v2-categories-tree"],
    queryFn: async () => {
      const [larges, mediums, smalls] = await Promise.all([
        rest<LargeRow[]>("GET", "category_large", { params: { select: "id,code,name,english_name,description", order: "sort_order.asc", limit: "100" } }),
        rest<MediumRow[]>("GET", "category_medium", { params: { select: "id,code,name,english_name,description,large_category_id", order: "sort_order.asc", limit: "500" } }),
        rest<SmallRow[]>("GET", "category_small", { params: { select: "id,code,name,english_name,description,medium_category_id,default_stock_unit_code,default_item_account_code,default_item_class_code", order: "sort_order.asc", limit: "2000" } }),
      ]);
      return { larges, mediums, smalls };
    },
    staleTime: 300_000,
  });

  const invalidateTree = () => qc.invalidateQueries({ queryKey: ["v2-categories-tree"] });

  const larges = useMemo<Cat[]>(() => (data?.larges ?? []).map(l => ({ id: l.id, code: l.code, name: l.name, en: l.english_name ?? "", description: l.description ?? "" })), [data]);
  const mediumsByLarge = useMemo(() => {
    const m: Record<string, Cat[]> = {};
    (data?.mediums ?? []).forEach(x => { (m[x.large_category_id] ??= []).push({ id: x.id, code: x.code, name: x.name, en: x.english_name ?? "", description: x.description ?? "" }); });
    return m;
  }, [data]);
  const smallsByMedium = useMemo(() => {
    const m: Record<string, SmallCat[]> = {};
    (data?.smalls ?? []).forEach(x => {
      (m[x.medium_category_id] ??= []).push({
        id: x.id, code: x.code, name: x.name, en: x.english_name ?? "", description: x.description ?? "",
        stock_unit: x.default_stock_unit_code ?? "—",
        account: x.default_item_account_code ?? "—",
        klass: x.default_item_class_code ?? "—",
      });
    });
    return m;
  }, [data]);

  const mediums = useMemo(() => selL ? (mediumsByLarge[selL] || []) : [], [selL, mediumsByLarge]);
  const smalls = useMemo(() => selM ? (smallsByMedium[selM] || []) : [], [selM, smallsByMedium]);
  const largeRow = useMemo(() => larges.find(x => x.id === selL), [larges, selL]);
  const medRow = useMemo(() => mediums.find(x => x.id === selM), [mediums, selM]);
  const smallRow = useMemo(() => smalls.find(x => x.id === selS), [smalls, selS]);

  // 현장용어 — admin은 전체, 그 외 활성만
  const { data: fieldTerms = [] } = useQuery({
    queryKey: ["v2-field-terms", selS, isAdmin],
    enabled: !!selS,
    queryFn: () => {
      const params: Record<string, string> = { select: "id,term,description,is_active,sort_order", small_category_id: `eq.${selS}`, order: "sort_order.asc" };
      if (!isAdmin) params.is_active = "eq.true";
      return rest<FieldTerm[]>("GET", "category_field_terms", { params });
    },
    staleTime: 120_000,
  });
  const invalidateTerms = () => qc.invalidateQueries({ queryKey: ["v2-field-terms", selS] });

  const { data: activeItemCount } = useQuery({
    queryKey: ["v2-small-item-count", smallRow?.name],
    enabled: !!smallRow,
    queryFn: () => restCount("items", { small_category: `eq.${smallRow!.name}`, is_active: "eq.true" }),
    staleTime: 120_000,
  });

  // ── 분류 추가/수정 mutation ────────────────────────────────────────
  const saveCatMut = useMutation({
    mutationFn: async (vars: { level: Level; mode: "add" | "edit"; id?: string; parentId?: string; body: Record<string, unknown> }) => {
      const table = CAT_TABLE[vars.level];
      if (vars.mode === "edit") {
        await rest("PATCH", table, { params: { id: `eq.${vars.id}` }, body: vars.body, prefer: "return=representation" });
      } else {
        const body = { ...vars.body };
        if (vars.level === "medium") body.large_category_id = vars.parentId;
        if (vars.level === "small") body.medium_category_id = vars.parentId;
        await rest("POST", table, { body, prefer: "return=representation" });
      }
    },
    onSuccess: () => { invalidateTree(); setCatDialog((d) => ({ ...d, open: false })); },
    onError: (e: unknown) => {
      const msg = (e as Error).message;
      alert(msg.includes("23505") ? "이미 사용 중인 분류코드입니다." : `저장 실패: ${msg}`);
    },
  });

  // ── 현장용어 mutations ─────────────────────────────────────────────
  const saveTermMut = useMutation({
    mutationFn: async (vars: { id?: string; body: Record<string, unknown> }) => {
      if (vars.id) {
        await rest("PATCH", "category_field_terms", { params: { id: `eq.${vars.id}` }, body: vars.body, prefer: "return=representation" });
      } else {
        await rest("POST", "category_field_terms", { body: vars.body, prefer: "return=representation" });
      }
    },
    onSuccess: () => { invalidateTerms(); setTermDialog(false); },
    onError: (e: unknown) => alert(`저장 실패: ${(e as Error).message}`),
  });
  const deleteTermMut = useMutation({
    mutationFn: async (id: string) => { await rest("DELETE", "category_field_terms", { params: { id: `eq.${id}` } }); },
    onSuccess: invalidateTerms,
    onError: (e: unknown) => alert(`삭제 실패: ${(e as Error).message}`),
  });
  const toggleTermMut = useMutation({
    mutationFn: async (vars: { id: string; is_active: boolean }) => {
      await rest("PATCH", "category_field_terms", { params: { id: `eq.${vars.id}` }, body: { is_active: vars.is_active }, prefer: "return=representation" });
    },
    onSuccess: invalidateTerms,
    onError: (e: unknown) => alert(`상태 변경 실패: ${(e as Error).message}`),
  });

  // ── 핸들러 ─────────────────────────────────────────────────────────
  const openAddCat = (level: Level, parentId?: string) => {
    setCatForm({ name: "", code: "", description: "" });
    setCatDialog({ open: true, level, mode: "add", parentId });
  };
  const openEditCat = (level: Level, c: Cat) => {
    setCatForm({ name: c.name, code: c.code, description: c.description });
    setCatDialog({ open: true, level, mode: "edit", id: c.id });
  };
  const submitCat = () => {
    const rule = CODE_RULE[catDialog.level];
    const name = catForm.name.trim();
    const code = catForm.code.trim().toUpperCase();
    if (!name) { alert("분류명을 입력하세요."); return; }
    if (!rule.re.test(code)) { alert(`분류코드는 ${rule.hint}입니다.`); return; }
    saveCatMut.mutate({
      level: catDialog.level, mode: catDialog.mode, id: catDialog.id, parentId: catDialog.parentId,
      body: { name, code, description: catForm.description.trim() || null },
    });
  };

  const openAddTerm = () => { setEditingTerm(null); setTermForm({ term: "", description: "" }); setTermDialog(true); };
  const openEditTerm = (t: FieldTerm) => { setEditingTerm(t); setTermForm({ term: t.term, description: t.description ?? "" }); setTermDialog(true); };
  const submitTerm = () => {
    const term = termForm.term.trim();
    if (!term) { alert("현장용어를 입력하세요."); return; }
    if (editingTerm) {
      saveTermMut.mutate({ id: editingTerm.id, body: { term, description: termForm.description.trim() || null } });
    } else {
      saveTermMut.mutate({ body: { small_category_id: selS, term, description: termForm.description.trim() || null, sort_order: fieldTerms.length } });
    }
  };

  const fullCode = smallRow ? `${largeRow?.code}·${medRow?.code}·${smallRow.code}` : null;
  const dispTerms = isAdmin ? fieldTerms : fieldTerms.filter(t => t.is_active);

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>분류 체계<span className="text-xs text-gray-500 font-normal ml-2">/ classification/tree</span></h1>
          <div className="meta">대 {data?.larges.length ?? "—"} / 중 {data?.mediums.length ?? "—"} / 소 {data?.smalls.length ?? "—"} 분류 — 좌→우 드릴다운{isLoading && " · 불러오는 중…"}</div>
        </div>
      </div>

      <div className="cat-three">
        <Panel title="대분류" count={larges.length} items={larges} selected={selL} onSelect={(c) => { setSelL(c); setSelM(null); setSelS(null); }} search={qL} setSearch={setQL}
          isAdmin={isAdmin} onAdd={() => openAddCat("large")} onEdit={(c) => openEditCat("large", c)} />
        <Panel title="중분류" count={mediums.length} items={mediums} selected={selM} onSelect={(c) => { setSelM(c); setSelS(null); }} parentLabel={largeRow?.name} search={qM} setSearch={setQM}
          isAdmin={isAdmin} onAdd={() => openAddCat("medium", selL ?? undefined)} addDisabled={!selL} onEdit={(c) => openEditCat("medium", c)} />
        <Panel title="소분류" count={smalls.length} items={smalls} selected={selS} onSelect={setSelS} parentLabel={medRow?.name} search={qS} setSearch={setQS}
          isAdmin={isAdmin} onAdd={() => openAddCat("small", selM ?? undefined)} addDisabled={!selM} onEdit={(c) => openEditCat("small", c)} />
      </div>

      {/* 선택된 소분류 상세 */}
      {smallRow ? (
        <>
          <div className="detail-card">
            <div className="d-h">
              <div className="title">{smallRow.name} — 상세</div>
              <div style={{ display: "flex", gap: 6 }}>
                {isAdmin && <button className="btn-sec" style={{ fontSize: 12 }} onClick={() => openEditCat("small", smallRow)}>✏ 편집</button>}
                <button className="btn-sec" style={{ fontSize: 12 }}>📋 활성 items ({activeItemCount ?? "…"})</button>
              </div>
            </div>
            <div className="d-grid">
              <div className="kv-mini"><span className="k">전체 코드</span><span className="v mono">{fullCode}</span></div>
              <div className="kv-mini"><span className="k">기본 재고단위</span><span className="v mono">{smallRow.stock_unit ?? "—"}</span></div>
              <div className="kv-mini"><span className="k">기본 품목계정</span><span className="v mono">{smallRow.account ?? "—"}</span></div>
              <div className="kv-mini"><span className="k">기본 품목클래스</span><span className="v mono">{smallRow.klass ?? "—"}</span></div>
            </div>
          </div>

          <div className="detail-card">
            <div className="d-h">
              <div className="title">
                현장용어
                <span style={{ fontWeight: 400, color: "#64748b", fontSize: 13, marginLeft: 6 }}>
                  ({dispTerms.filter(t => t.is_active).length}건)
                </span>
              </div>
              {isAdmin && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-sec" style={{ fontSize: 12 }} onClick={openAddTerm}>＋ 추가</button>
                </div>
              )}
            </div>
            {dispTerms.length > 0 ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {dispTerms.map((t) => (
                  <span key={t.id} className={`term-chip ${t.is_active ? "" : "off"}`}>
                    <span
                      onClick={() => isAdmin && openEditTerm(t)}
                      style={{ cursor: isAdmin ? "pointer" : "default" }}
                      title={isAdmin ? "클릭하여 수정" : ""}
                    >{t.term}</span>
                    {isAdmin && (
                      <>
                        <button className="chip-act" title={t.is_active ? "미사용 처리" : "사용 처리"} onClick={() => toggleTermMut.mutate({ id: t.id, is_active: !t.is_active })}>{t.is_active ? "⊘" : "✓"}</button>
                        <button className="chip-act del" title="삭제" onClick={() => { if (confirm(`현장용어 "${t.term}"를 삭제하시겠습니까?`)) deleteTermMut.mutate(t.id); }}>×</button>
                      </>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <div className="hint">등록된 현장용어가 없습니다</div>
            )}
            <div className="hint" style={{ marginTop: 12 }}>카탈로그 검색 시 한글명·영문명 외에도 매칭되는 별칭</div>
          </div>
        </>
      ) : (
        <div className="detail-card">
          <div className="empty">좌측 트리에서 소분류를 선택하세요</div>
        </div>
      )}

      {/* Dialog: 분류 추가/수정 */}
      {catDialog.open && (
        <div className="dialog-overlay" onClick={() => setCatDialog((d) => ({ ...d, open: false }))}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-head">
              <h3>{LEVEL_LABEL[catDialog.level]} {catDialog.mode === "add" ? "추가" : "수정"}</h3>
              <button className="close" onClick={() => setCatDialog((d) => ({ ...d, open: false }))}>×</button>
            </div>
            <div className="dialog-body">
              <div className="form-row">
                <label>분류코드 *</label>
                <input
                  value={catForm.code}
                  maxLength={CODE_RULE[catDialog.level].max}
                  onChange={(e) => setCatForm({ ...catForm, code: e.target.value.toUpperCase() })}
                  placeholder={CODE_RULE[catDialog.level].hint}
                  style={{ fontFamily: "ui-monospace, monospace" }}
                />
                <div className="form-hint">{CODE_RULE[catDialog.level].hint} · 품목코드 prefix에 직접 반영됩니다</div>
              </div>
              <div className="form-row">
                <label>분류명 *</label>
                <input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="분류명을 입력하세요" />
              </div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <label>설명</label>
                <input value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} placeholder="설명 (선택)" />
              </div>
            </div>
            <div className="dialog-foot">
              <button className="btn-sec" onClick={() => setCatDialog((d) => ({ ...d, open: false }))}>취소</button>
              <button className="btn-primary" onClick={submitCat} disabled={saveCatMut.isPending}>
                {saveCatMut.isPending ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: 현장용어 추가/수정 */}
      {termDialog && (
        <div className="dialog-overlay" onClick={() => setTermDialog(false)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-head">
              <h3>현장용어 {editingTerm ? "수정" : "추가"}</h3>
              <button className="close" onClick={() => setTermDialog(false)}>×</button>
            </div>
            <div className="dialog-body">
              <div className="form-hint" style={{ marginBottom: 12 }}>소분류: <strong style={{ color: "#1f2937" }}>{smallRow?.name}</strong></div>
              <div className="form-row">
                <label>현장용어 *</label>
                <input value={termForm.term} onChange={(e) => setTermForm({ ...termForm, term: e.target.value })} placeholder="현장에서 사용하는 용어" />
              </div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <label>설명</label>
                <input value={termForm.description} onChange={(e) => setTermForm({ ...termForm, description: e.target.value })} placeholder="설명 (선택)" />
              </div>
            </div>
            <div className="dialog-foot">
              <button className="btn-sec" onClick={() => setTermDialog(false)}>취소</button>
              <button className="btn-primary" onClick={submitTerm} disabled={saveTermMut.isPending}>
                {saveTermMut.isPending ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const PAGE_STYLES = `
.cat-three { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 12px; margin-top: 16px; }
.cat-panel { background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; min-height: 420px; max-height: 480px; }
.panel-h { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
.panel-h .h-title { font-size: 14px; font-weight: 700; color: #003876; display: flex; align-items: baseline; }
.panel-h .h-title .count { background: #eff6ff; color: #003876; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 600; margin-left: 6px; border: 1px solid #bfdbfe; }
.btn-add { background: #fff; color: #003876; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; }
.btn-add:hover { background: #eff6ff; border-color: #003876; }
.btn-add:disabled { opacity: 0.4; cursor: not-allowed; }
.panel-search { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
.panel-search input { width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; }
.panel-search input:focus { outline: none; border-color: #003876; box-shadow: 0 0 0 2px rgba(0,56,118,0.1); }
.panel-list { flex: 1; overflow-y: auto; }
.cat-row { display: flex; align-items: center; padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #f8fafc; transition: background 0.1s; }
.cat-row:hover { background: #f8fafc; }
.cat-row.selected { background: #eff6ff; border-left: 3px solid #003876; padding-left: 11px; }
.cat-row .cat-main { flex: 1; min-width: 0; }
.cat-row .cat-name { font-size: 14px; font-weight: 600; color: #1f2937; }
.cat-row .cat-meta { display: flex; gap: 6px; align-items: center; margin-top: 3px; }
.cat-row .cat-code { padding: 1px 6px; background: #f1f5f9; color: #003876; border: 1px solid #cbd5e1; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; }
.cat-row .cat-en { font-size: 11px; color: #94a3b8; font-style: italic; }
.cat-row .row-acts { opacity: 0; transition: opacity 0.1s; }
.cat-row:hover .row-acts, .cat-row.selected .row-acts { opacity: 1; }
.row-acts button { width: 24px; height: 24px; border: none; background: transparent; cursor: pointer; color: #64748b; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; }
.row-acts button:hover { background: #fff; color: #003876; }
.row-acts svg { width: 13px; height: 13px; }
.empty { padding: 32px 14px; text-align: center; color: #94a3b8; font-size: 13px; }

/* 하단 상세 카드 */
.detail-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px 18px; margin-top: 12px; }
.d-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.d-h .title { font-size: 15px; font-weight: 700; color: #003876; display: flex; align-items: baseline; }
.d-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kv-mini { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
.kv-mini .k { font-size: 11px; color: #64748b; font-weight: 600; }
.kv-mini .v { font-size: 13px; color: #1f2937; font-weight: 500; }
.kv-mini .v.mono { font-family: ui-monospace, SFMono-Regular, monospace; }

/* 현장용어 chip */
.term-chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px 3px 12px; border-radius: 999px; font-size: 13px; font-weight: 600; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; line-height: 1.5; }
.term-chip.off { background: #f1f5f9; color: #94a3b8; border-color: #e2e8f0; text-decoration: line-through; }
.term-chip .chip-act { border: none; background: rgba(0,0,0,0.06); color: inherit; width: 17px; height: 17px; border-radius: 999px; cursor: pointer; font-size: 12px; line-height: 1; display: inline-flex; align-items: center; justify-content: center; }
.term-chip .chip-act:hover { background: rgba(0,0,0,0.14); }
.term-chip .chip-act.del:hover { background: #fecaca; color: #b91c1c; }
.hint { font-size: 12px; color: #64748b; }

.btn-sec { background: #fff; color: #003876; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-sec:hover { background: #eff6ff; border-color: #003876; }
.btn-primary { background: #003876; color: #fff; border: 1px solid #003876; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-primary:hover { background: #002a5c; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.t-mini { font-size: 11px; font-weight: 600; }
.t-slate { color: #64748b; }

.dialog-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog-box { background: #fff; border-radius: 10px; width: 440px; box-shadow: 0 20px 50px rgba(0,0,0,0.25); overflow: hidden; }
.dialog-head { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
.dialog-head h3 { font-size: 16px; font-weight: 700; color: #003876; margin: 0; }
.dialog-head .close { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 20px; }
.dialog-body { padding: 18px 20px; }
.form-row { margin-bottom: 14px; }
.form-row label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px; }
.form-row input { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
.form-row input:focus { outline: none; border-color: #003876; box-shadow: 0 0 0 2px rgba(0,56,118,0.1); }
.form-hint { font-size: 11px; color: #94a3b8; margin-top: 5px; }
.dialog-foot { padding: 12px 20px; border-top: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: flex-end; gap: 8px; }
`;
