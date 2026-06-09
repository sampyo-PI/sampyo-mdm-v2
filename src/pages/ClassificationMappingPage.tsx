import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rest } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

type Cat = { id: string; code: string; name: string };
type AttrMap = { id: string; attribute_id: string; code: string; name: string; sort_order: number; include_in_name: boolean; unit: string | null };
type AttrOpt = { id: string; code: string; name: string; unit: string | null };

type LargeRow = { id: string; code: string; name: string };
type MediumRow = LargeRow & { large_category_id: string };
type SmallRow = LargeRow & { medium_category_id: string };
type MappingRow = { id: string; attribute_id: string; sort_order: number; include_in_name: boolean; attributes: { code: string; name: string; unit: string | null } | null };

export function ClassificationMappingPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [expL, setExpL] = useState<Set<string>>(new Set());
  const [expM, setExpM] = useState<Set<string>>(new Set());
  const [selSmall, setSelSmall] = useState<{ id: string; code: string; name: string; path: string } | null>(null);

  // 속성 추가 다이얼로그
  const [addOpen, setAddOpen] = useState(false);
  const [addFilter, setAddFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["v2-categories-mapping"],
    queryFn: async () => {
      const [larges, mediums, smalls] = await Promise.all([
        rest<LargeRow[]>("GET", "category_large", { params: { select: "id,code,name", order: "sort_order.asc", limit: "100" } }),
        rest<MediumRow[]>("GET", "category_medium", { params: { select: "id,code,name,large_category_id", order: "sort_order.asc", limit: "500" } }),
        rest<SmallRow[]>("GET", "category_small", { params: { select: "id,code,name,medium_category_id", order: "sort_order.asc", limit: "2000" } }),
      ]);
      return { larges, mediums, smalls };
    },
    staleTime: 300_000,
  });

  const larges = useMemo<Cat[]>(() => data?.larges ?? [], [data]);
  const medsByLarge = useMemo(() => {
    const m: Record<string, Cat[]> = {};
    (data?.mediums ?? []).forEach(x => { (m[x.large_category_id] ??= []).push(x); });
    return m;
  }, [data]);
  const smallsByMed = useMemo(() => {
    const m: Record<string, Cat[]> = {};
    (data?.smalls ?? []).forEach(x => { (m[x.medium_category_id] ??= []).push(x); });
    return m;
  }, [data]);

  const toggleL = (c: string) => { const n = new Set(expL); n.has(c) ? n.delete(c) : n.add(c); setExpL(n); };
  const toggleM = (c: string) => { const n = new Set(expM); n.has(c) ? n.delete(c) : n.add(c); setExpM(n); };

  const { data: mapping = [] } = useQuery({
    queryKey: ["v2-cat-attr-mapping", selSmall?.id],
    enabled: !!selSmall,
    queryFn: () => rest<MappingRow[]>("GET", "category_attribute_mappings", {
      params: { select: "id,attribute_id,sort_order,include_in_name,attributes(code,name,unit)", small_category_id: `eq.${selSmall!.id}`, order: "sort_order.asc" },
    }).then(rows => rows.filter(r => r.attributes).map<AttrMap>(r => ({
      id: r.id, attribute_id: r.attribute_id,
      code: r.attributes!.code, name: r.attributes!.name, unit: r.attributes!.unit,
      sort_order: r.sort_order, include_in_name: r.include_in_name,
    }))),
    staleTime: 120_000,
  });

  // 전체 활성 속성 (추가 다이얼로그용)
  const { data: allAttrs = [] } = useQuery({
    queryKey: ["v2-mapping-attrs"],
    enabled: isAdmin,
    queryFn: () => rest<AttrOpt[]>("GET", "attributes", { params: { select: "id,code,name,unit", is_active: "eq.true", order: "name.asc", limit: "3000" } }),
    staleTime: 300_000,
  });

  const invalidateMapping = () => qc.invalidateQueries({ queryKey: ["v2-cat-attr-mapping", selSmall?.id] });

  // ── mutations (즉시 영속) ──────────────────────────────────────────
  const addMut = useMutation({
    mutationFn: async (attr: AttrOpt) => {
      const maxOrder = mapping.reduce((m, r) => Math.max(m, r.sort_order), 0);
      await rest("POST", "category_attribute_mappings", {
        body: { small_category_id: selSmall!.id, attribute_id: attr.id, include_in_name: false, sort_order: maxOrder + 1 },
        prefer: "return=representation",
      });
    },
    onSuccess: invalidateMapping,
    onError: (e: unknown) => {
      const msg = (e as Error).message;
      alert(msg.includes("23505") ? "이미 매핑된 속성입니다." : `추가 실패: ${msg}`);
    },
  });
  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await rest("DELETE", "category_attribute_mappings", { params: { id: `eq.${id}` } }); },
    onSuccess: invalidateMapping,
    onError: (e: unknown) => alert(`삭제 실패: ${(e as Error).message}`),
  });
  const toggleMut = useMutation({
    mutationFn: async (vars: { id: string; include_in_name: boolean }) => {
      await rest("PATCH", "category_attribute_mappings", { params: { id: `eq.${vars.id}` }, body: { include_in_name: vars.include_in_name }, prefer: "return=representation" });
    },
    onSuccess: invalidateMapping,
    onError: (e: unknown) => alert(`변경 실패: ${(e as Error).message}`),
  });
  const swapMut = useMutation({
    mutationFn: async (vars: { a: AttrMap; b: AttrMap }) => {
      // 두 매핑의 sort_order를 교환
      await rest("PATCH", "category_attribute_mappings", { params: { id: `eq.${vars.a.id}` }, body: { sort_order: vars.b.sort_order }, prefer: "return=representation" });
      await rest("PATCH", "category_attribute_mappings", { params: { id: `eq.${vars.b.id}` }, body: { sort_order: vars.a.sort_order }, prefer: "return=representation" });
    },
    onSuccess: invalidateMapping,
    onError: (e: unknown) => alert(`순서 변경 실패: ${(e as Error).message}`),
  });

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= mapping.length) return;
    swapMut.mutate({ a: mapping[idx], b: mapping[j] });
  };

  const mappedIds = useMemo(() => new Set(mapping.map(m => m.attribute_id)), [mapping]);
  const availableAttrs = useMemo(() => {
    const f = addFilter.trim().toLowerCase();
    return allAttrs
      .filter(a => !mappedIds.has(a.id))
      .filter(a => !f || a.name.toLowerCase().includes(f) || a.code.toLowerCase().includes(f))
      .slice(0, 200);
  }, [allAttrs, mappedIds, addFilter]);

  const busy = addMut.isPending || deleteMut.isPending || toggleMut.isPending || swapMut.isPending;

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>분류-속성 매핑</h1>
        </div>
      </div>

      <div className="map-layout">
        <div className="map-card tree-card">
          <div className="card-h">
            <div className="title">분류 체계</div>
            <span className="t-meta">대 {data?.larges.length ?? "—"} / 중 {data?.mediums.length ?? "—"} / 소 {data?.smalls.length ?? "—"}{isLoading && " · 로딩…"}</span>
          </div>
          <div className="tree-list">
            {larges.map(L => (
              <div key={L.id}>
                <div className="tree-node lvl-1" onClick={() => toggleL(L.id)}>
                  <span className="caret">{expL.has(L.id) ? "▼" : "▶"}</span>
                  <span className="t-code">{L.code}</span>
                  <span className="t-name">{L.name}</span>
                </div>
                {expL.has(L.id) && (medsByLarge[L.id] || []).map(M => (
                  <div key={M.id}>
                    <div className="tree-node lvl-2" onClick={() => toggleM(M.id)}>
                      <span className="caret">{expM.has(M.id) ? "▼" : "▶"}</span>
                      <span className="t-code">{M.code}</span>
                      <span className="t-name">{M.name}</span>
                    </div>
                    {expM.has(M.id) && (smallsByMed[M.id] || []).map(S => (
                      <div key={S.id}
                        className={`tree-node lvl-3 ${selSmall?.id === S.id ? "selected" : ""}`}
                        onClick={() => setSelSmall({ id: S.id, code: S.code, name: S.name, path: `${L.name} ▸ ${M.name} ▸ ${S.name}` })}>
                        <span className="caret"></span>
                        <span className="t-code">{S.code}</span>
                        <span className="t-name">{S.name}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="map-card attr-card">
          {selSmall ? (
            <>
              <div className="card-h">
                <div>
                  <div className="title">{selSmall.name} <span className="t-meta">속성 {mapping.length}개</span></div>
                  <div className="t-meta breadcrumb">{selSmall.path}</div>
                </div>
                {isAdmin && <button className="btn-primary" onClick={() => { setAddFilter(""); setAddOpen(true); }}>＋ 속성 추가</button>}
              </div>


              {mapping.length === 0 ? (
                <div className="empty-state">
                  <div className="ic">🔗</div>
                  <div>이 소분류에 매핑된 속성이 없습니다</div>
                  {isAdmin && <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => { setAddFilter(""); setAddOpen(true); }}>+ 속성 매핑 추가</button>}
                </div>
              ) : (
                <div className="attr-list">
                  {mapping.map((a, idx) => (
                    <div key={a.id} className="attr-item">
                      {isAdmin ? (
                        <span className="reorder">
                          <button className="ro-btn" disabled={idx === 0 || busy} title="위로" onClick={() => move(idx, -1)}>▲</button>
                          <button className="ro-btn" disabled={idx === mapping.length - 1 || busy} title="아래로" onClick={() => move(idx, 1)}>▼</button>
                        </span>
                      ) : (
                        <span className="grip"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></svg></span>
                      )}
                      <span className="seq">#{idx + 1}</span>
                      <span className="attr-code">{a.code}</span>
                      <span className="attr-name">{a.name}</span>
                      {a.unit && <span className="attr-unit">{a.unit}</span>}
                      <label className="ck-include">
                        <input type="checkbox" checked={a.include_in_name} disabled={!isAdmin || busy} onChange={(e) => toggleMut.mutate({ id: a.id, include_in_name: e.target.checked })} />
                        <span>품목명 포함</span>
                      </label>
                      {isAdmin && (
                        <button className="del-btn" title="매핑 제거" disabled={busy} onClick={() => { if (confirm(`"${a.name}" 속성 매핑을 제거하시겠습니까?`)) deleteMut.mutate(a.id); }}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1.5 14a2 2 0 0 1-2 2H8.5a2 2 0 0 1-2-2L5 6"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="ic">📂</div>
              <div>좌측 트리에서 소분류를 선택하세요</div>
            </div>
          )}
        </div>
      </div>

      {/* Dialog: 속성 추가 */}
      {addOpen && (
        <div className="dialog-overlay" onClick={() => setAddOpen(false)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-head">
              <h3>속성 추가 <span className="t-meta" style={{ fontWeight: 500 }}>→ {selSmall?.name}</span></h3>
              <button className="close" onClick={() => setAddOpen(false)}>×</button>
            </div>
            <div className="dialog-body">
              <input className="add-search" autoFocus placeholder="속성명 · 코드 검색…" value={addFilter} onChange={(e) => setAddFilter(e.target.value)} />
              <div className="add-list">
                {availableAttrs.length === 0 ? (
                  <div className="hint" style={{ padding: 16, textAlign: "center" }}>{addFilter ? "검색 결과 없음" : "추가 가능한 속성이 없습니다"}</div>
                ) : (
                  availableAttrs.map(a => (
                    <button key={a.id} className="add-row" disabled={addMut.isPending} onClick={() => addMut.mutate(a)}>
                      <span className="attr-code">{a.code}</span>
                      <span className="add-name">{a.name}</span>
                      {a.unit && <span className="attr-unit">{a.unit}</span>}
                      <span className="add-plus">＋</span>
                    </button>
                  ))
                )}
              </div>
              {allAttrs.length > 0 && availableAttrs.length === 200 && (
                <div className="hint" style={{ marginTop: 8 }}>상위 200개만 표시 — 검색으로 좁혀주세요</div>
              )}
            </div>
            <div className="dialog-foot">
              <button className="btn-sec" onClick={() => setAddOpen(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const PAGE_STYLES = `
.map-layout { display: grid; grid-template-columns: 380px 1fr; gap: 12px; margin-top: 16px; }
.map-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; min-height: 600px; max-height: 720px; }
.card-h { padding: 14px 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.card-h .title { font-size: 15px; font-weight: 700; color: #003876; }

.tree-list { flex: 1; overflow-y: auto; padding: 4px 0; }
.tree-node { display: flex; align-items: center; gap: 6px; padding: 6px 12px; cursor: pointer; font-size: 13px; transition: background 0.1s; }
.tree-node:hover { background: #f8fafc; }
.tree-node .caret { width: 14px; font-size: 9px; color: #94a3b8; }
.tree-node .t-code { padding: 1px 6px; background: #f1f5f9; color: #003876; border: 1px solid #cbd5e1; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; min-width: 28px; text-align: center; }
.tree-node .t-name { color: #1f2937; }
.tree-node.lvl-1 { font-weight: 700; }
.tree-node.lvl-1 .t-name { color: #003876; }
.tree-node.lvl-2 { padding-left: 28px; font-weight: 500; }
.tree-node.lvl-3 { padding-left: 56px; font-weight: 500; }
.tree-node.lvl-3.selected { background: #eff6ff; border-left: 3px solid #003876; padding-left: 53px; }
.tree-node.lvl-3.selected .t-name { color: #003876; font-weight: 600; }

.attr-card .card-h .breadcrumb { margin-top: 4px; }
.btn-primary { background: #003876; color: #fff; border: 1px solid #003876; padding: 7px 14px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-primary:hover { background: #002a5c; }
.btn-sec { background: #fff; color: #003876; border: 1px solid #cbd5e1; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-sec:hover { background: #eff6ff; border-color: #003876; }
.info-strip { background: #eff6ff; padding: 8px 16px; font-size: 12px; color: #1e293b; border-bottom: 1px solid #e2e8f0; }
.attr-list { flex: 1; overflow-y: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; }
.attr-item { display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; transition: border-color 0.1s; }
.attr-item:hover { border-color: #003876; }
.attr-item .grip { color: #94a3b8; display: flex; }
.attr-item .grip svg { width: 16px; height: 16px; }
.attr-item .reorder { display: inline-flex; flex-direction: column; gap: 1px; }
.attr-item .ro-btn { width: 18px; height: 14px; border: 1px solid #cbd5e1; background: #fff; color: #64748b; font-size: 8px; line-height: 1; border-radius: 3px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; }
.attr-item .ro-btn:hover:not(:disabled) { background: #eff6ff; color: #003876; border-color: #003876; }
.attr-item .ro-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.attr-item .seq { font-family: ui-monospace, monospace; color: #64748b; font-size: 12px; font-weight: 600; min-width: 26px; }
.attr-item .attr-code { padding: 1px 7px; background: #f1f5f9; color: #003876; border: 1px solid #cbd5e1; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 11px; font-weight: 600; }
.attr-item .attr-name { font-size: 14px; font-weight: 600; color: #1f2937; flex: 1; }
.attr-item .attr-unit { font-size: 11px; color: #64748b; font-family: ui-monospace, monospace; background: #fef3c7; padding: 1px 6px; border-radius: 4px; border: 1px solid #fde68a; }
.attr-item .ck-include { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; color: #475569; }
.attr-item .ck-include input { width: 14px; height: 14px; accent-color: #003876; }
.attr-item .del-btn { width: 28px; height: 28px; border-radius: 4px; border: none; background: transparent; color: #94a3b8; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.attr-item .del-btn:hover:not(:disabled) { background: #fef2f2; color: #b91c1c; }
.attr-item .del-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.attr-item .del-btn svg { width: 14px; height: 14px; }

.empty-state { padding: 60px 20px; text-align: center; color: #94a3b8; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.empty-state .ic { font-size: 36px; opacity: 0.4; margin-bottom: 10px; }

.t-meta { font-size: 12px; color: #64748b; font-weight: 500; }

.dialog-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog-box { background: #fff; border-radius: 10px; width: 480px; box-shadow: 0 20px 50px rgba(0,0,0,0.25); overflow: hidden; }
.dialog-head { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
.dialog-head h3 { font-size: 16px; font-weight: 700; color: #003876; margin: 0; }
.dialog-head .close { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 20px; }
.dialog-body { padding: 18px 20px; }
.add-search { width: 100%; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; margin-bottom: 10px; }
.add-search:focus { outline: none; border-color: #003876; box-shadow: 0 0 0 2px rgba(0,56,118,0.1); }
.add-list { max-height: 340px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.add-row { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff; cursor: pointer; }
.add-row:hover:not(:disabled) { background: #eff6ff; border-color: #003876; }
.add-row:disabled { opacity: 0.5; cursor: not-allowed; }
.add-row .add-name { flex: 1; font-size: 14px; font-weight: 600; color: #1f2937; }
.add-row .add-plus { color: #003876; font-weight: 700; }
.hint { font-size: 12px; color: #64748b; }
.dialog-foot { padding: 12px 20px; border-top: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: flex-end; gap: 8px; }
`;
