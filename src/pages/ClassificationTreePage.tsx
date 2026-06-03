import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { rest, restCount } from "../lib/supabase";

type Cat = { id: string; code: string; name: string; en: string };
type SmallCat = Cat & { stock_unit: string; account: string; klass: string };

type LargeRow = { id: string; code: string; name: string; english_name: string | null };
type MediumRow = LargeRow & { large_category_id: string };
type SmallRow = LargeRow & { medium_category_id: string; default_stock_unit_code: string | null; default_item_account_code: string | null; default_item_class_code: string | null };

const Panel = ({ title, count, items, selected, onSelect, parentLabel, search, setSearch }: {
  title: string; count: number; items: Cat[]; selected: string | null; onSelect: (id: string) => void;
  parentLabel?: string; search: string; setSearch: (s: string) => void;
}) => (
  <div className="cat-panel">
    <div className="panel-h">
      <div className="h-title">
        {title} <span className="count">{count}</span>
        {parentLabel && <span className="t-mini t-slate" style={{ marginLeft: 6, fontWeight: 500 }}>/ {parentLabel}</span>}
      </div>
      <button className="btn-add">＋ 추가</button>
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
            <div className="row-acts">
              <button title="편집"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg></button>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

export function ClassificationTreePage() {
  const [selL, setSelL] = useState<string | null>(null);
  const [selM, setSelM] = useState<string | null>(null);
  const [selS, setSelS] = useState<string | null>(null);
  const [qL, setQL] = useState("");
  const [qM, setQM] = useState("");
  const [qS, setQS] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["v2-categories-tree"],
    queryFn: async () => {
      const [larges, mediums, smalls] = await Promise.all([
        rest<LargeRow[]>("GET", "category_large", { params: { select: "id,code,name,english_name", order: "sort_order.asc", limit: "100" } }),
        rest<MediumRow[]>("GET", "category_medium", { params: { select: "id,code,name,english_name,large_category_id", order: "sort_order.asc", limit: "500" } }),
        rest<SmallRow[]>("GET", "category_small", { params: { select: "id,code,name,english_name,medium_category_id,default_stock_unit_code,default_item_account_code,default_item_class_code", order: "sort_order.asc", limit: "2000" } }),
      ]);
      return { larges, mediums, smalls };
    },
    staleTime: 300_000,
  });

  const larges = useMemo<Cat[]>(() => (data?.larges ?? []).map(l => ({ id: l.id, code: l.code, name: l.name, en: l.english_name ?? "" })), [data]);
  const mediumsByLarge = useMemo(() => {
    const m: Record<string, Cat[]> = {};
    (data?.mediums ?? []).forEach(x => { (m[x.large_category_id] ??= []).push({ id: x.id, code: x.code, name: x.name, en: x.english_name ?? "" }); });
    return m;
  }, [data]);
  const smallsByMedium = useMemo(() => {
    const m: Record<string, SmallCat[]> = {};
    (data?.smalls ?? []).forEach(x => {
      (m[x.medium_category_id] ??= []).push({
        id: x.id, code: x.code, name: x.name, en: x.english_name ?? "",
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

  const { data: fieldTerms = [] } = useQuery({
    queryKey: ["v2-field-terms", selS],
    enabled: !!selS,
    queryFn: () => rest<{ term: string }[]>("GET", "category_field_terms", { params: { select: "term", small_category_id: `eq.${selS}`, is_active: "eq.true", order: "sort_order.asc" } }).then(r => r.map(x => x.term)),
    staleTime: 120_000,
  });

  const { data: activeItemCount } = useQuery({
    queryKey: ["v2-small-item-count", smallRow?.name],
    enabled: !!smallRow,
    queryFn: () => restCount("items", { small_category: `eq.${smallRow!.name}`, is_active: "eq.true" }),
    staleTime: 120_000,
  });

  const fullCode = smallRow ? `${largeRow?.code}·${medRow?.code}·${smallRow.code}` : null;

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>분류 체계<span className="text-xs text-gray-500 font-normal ml-2">/ classification/tree</span></h1>
          <div className="meta">대 {data?.larges.length ?? "—"} / 중 {data?.mediums.length ?? "—"} / 소 {data?.smalls.length ?? "—"} 분류 — 좌→우 드릴다운{isLoading && " · 불러오는 중…"}</div>
        </div>
        <div className="actions">
          <button className="btn-sec">📊 분류체계 다운로드</button>
        </div>
      </div>

      <div className="cat-three">
        <Panel title="대분류" count={larges.length} items={larges} selected={selL} onSelect={(c) => { setSelL(c); setSelM(null); setSelS(null); }} search={qL} setSearch={setQL} />
        <Panel title="중분류" count={mediums.length} items={mediums} selected={selM} onSelect={(c) => { setSelM(c); setSelS(null); }} parentLabel={largeRow?.name} search={qM} setSearch={setQM} />
        <Panel title="소분류" count={smalls.length} items={smalls} selected={selS} onSelect={setSelS} parentLabel={medRow?.name} search={qS} setSearch={setQS} />
      </div>

      {/* 선택된 소분류 상세 */}
      {smallRow ? (
        <>
          <div className="detail-card">
            <div className="d-h">
              <div className="title">{smallRow.name} — 상세</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn-sec" style={{ fontSize: 12 }}>✏ 편집</button>
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
                  ({fieldTerms.length}건)
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn-sec" style={{ fontSize: 12 }}>＋ 추가</button>
                <button className="btn-sec" style={{ fontSize: 12, color: "#dc2626", borderColor: "#fca5a5" }}>🗑 삭제</button>
              </div>
            </div>
            {fieldTerms.length > 0 ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {fieldTerms.map((t, i) => <span key={i} className="term-chip">{t}</span>)}
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
.term-chip { display: inline-block; padding: 3px 12px; border-radius: 999px; font-size: 13px; font-weight: 600; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; line-height: 1.5; }
.hint { font-size: 12px; color: #64748b; }

.btn-sec { background: #fff; color: #003876; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-sec:hover { background: #eff6ff; border-color: #003876; }
.t-mini { font-size: 11px; font-weight: 600; }
.t-slate { color: #64748b; }
`;
