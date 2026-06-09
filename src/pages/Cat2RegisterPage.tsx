import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchCat2SmallCategories,
  fetchCat2CategoryFields,
  cat2DedupCheck,
  type DedupResult,
} from "../lib/cat2Queries";

const DECISION_LABEL: Record<string, { txt: string; cls: string }> = {
  duplicate: { txt: "중복 (이미 존재)", cls: "b-warn" },
  similar: { txt: "유사 — 검토 필요", cls: "b-draft" },
  review: { txt: "후보 있음 — 수동 검토", cls: "b-draft" },
  new: { txt: "신규 (중복 없음)", cls: "b-blue" },
};

export function Cat2RegisterPage() {
  const [category, setCategory] = useState("");
  const [itemName, setItemName] = useState("");
  const [maker, setMaker] = useState("");
  const [model, setModel] = useState("");
  const [spec, setSpec] = useState("");
  const [subType, setSubType] = useState("");
  const [attrs, setAttrs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<DedupResult | null>(null);
  const [checking, setChecking] = useState(false);

  const cats = useQuery({ queryKey: ["cat2-small-cats"], queryFn: fetchCat2SmallCategories, staleTime: 5 * 60_000 });
  const fields = useQuery({
    queryKey: ["cat2-fields", category],
    queryFn: () => fetchCat2CategoryFields(category),
    enabled: !!category,
    staleTime: 60_000,
  });

  // 분류 바뀌면 분류 종속 입력 초기화
  useEffect(() => { setSubType(""); setAttrs({}); setResult(null); }, [category]);

  const canCheck = !!category && !!itemName.trim() && !checking;

  async function runCheck() {
    setChecking(true); setResult(null);
    try {
      const cleanAttrs = Object.fromEntries(Object.entries(attrs).filter(([, v]) => v && v.trim()));
      const r = await cat2DedupCheck({
        category, itemName: itemName.trim(),
        spec: spec.trim() || null, maker: maker.trim() || null, model: model.trim() || null,
        subType: subType || null, attributes: cleanAttrs,
      });
      setResult(r);
    } catch (e) {
      setResult({ decision: "review", error: String(e) });
    } finally {
      setChecking(false);
    }
  }

  const dl = result ? (DECISION_LABEL[result.decision] ?? { txt: result.decision, cls: "b-draft" }) : null;

  return (
    <section className="page-card">
      <div className="page-h">
        <div>
          <h1>품목등록 ▸ 표준 품목등록 + 중복검사</h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 14 }}>
        {/* 입력 */}
        <div className="form-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 className="t-h2">입력</h2>

          <label className="fld">
            <span>소분류 <em style={{ color: "var(--c-danger,#dc2626)" }}>*</em></span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">— 소분류 선택 —</option>
              {(cats.data ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label className="fld"><span>품목명 <em style={{ color: "var(--c-danger,#dc2626)" }}>*</em></span>
            <input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="예: V-BELT" /></label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label className="fld"><span>제조사</span><input value={maker} onChange={(e) => setMaker(e.target.value)} /></label>
            <label className="fld"><span>모델</span><input value={model} onChange={(e) => setModel(e.target.value)} /></label>
          </div>
          <label className="fld"><span>규격</span><input value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="예: 8V-1370" /></label>

          {category && (
            <label className="fld">
              <span>세부유형 (sub_type)</span>
              <select value={subType} onChange={(e) => setSubType(e.target.value)} disabled={fields.isLoading}>
                <option value="">— 선택 —</option>
                {(fields.data?.sub_types ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          )}

          {(fields.data?.attr_names ?? []).length > 0 && (
            <div>
              <div className="t-meta" style={{ marginBottom: 6, color: "var(--c-text-sub)" }}>속성 (이 분류의 실제 저장 속성 — 정규화 후 비교)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {(fields.data?.attr_names ?? []).map((name) => (
                  <label className="fld" key={name}>
                    <span>{name}</span>
                    <input value={attrs[name] ?? ""} onChange={(e) => setAttrs((p) => ({ ...p, [name]: e.target.value }))} />
                  </label>
                ))}
              </div>
            </div>
          )}

          <button className="btn-pri" type="button" disabled={!canCheck} onClick={runCheck} style={{ marginTop: 6 }}>
            {checking ? "중복검사 중…" : "중복검사"}
          </button>
        </div>

        {/* 결과 */}
        <div className="form-card">
          <h2 className="t-h2">중복검사 결과</h2>
          {!result && <div className="meta" style={{ marginTop: 10 }}>입력 후 [중복검사]를 누르면 정규화 → 후보추출 → 동일성 판정 결과가 표시됩니다.</div>}
          {result?.error && <div className="badge b-warn" style={{ marginTop: 10 }}>오류: {result.error}</div>}
          {result && !result.error && dl && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={`badge ${dl.cls}`} style={{ fontSize: 14, padding: "4px 12px" }}>{dl.txt}</span>
                <span className="t-meta" style={{ color: "var(--c-text-sub)" }}>
                  후보 {result.candidates_considered ?? 0} · 완전일치 {result.exact_dim_matches ?? 0} · LLM {result.llm_available ? "판정" : "불가(폴백)"}
                </span>
              </div>
              {result.normalized && <div className="t-mini" style={{ color: "var(--c-text-sub)" }}>정규화: {JSON.stringify(result.normalized)}</div>}

              {(result.matches ?? []).length > 0 && (
                <div>
                  <div className="t-meta" style={{ fontWeight: 600, marginBottom: 4 }}>동일 판정 (LLM)</div>
                  {(result.matches ?? []).map((m, i) => (
                    <div key={i} className="t-mini" style={{ padding: "4px 0", borderBottom: "1px solid var(--c-border)" }}>
                      <span className="font-mono" style={{ color: "var(--c-accent-500)" }}>{m.legacy_code}</span>
                      <span style={{ color: "var(--c-text-sub)" }}> · conf {m.confidence} · {m.reason}</span>
                    </div>
                  ))}
                </div>
              )}

              {(result.candidates ?? []).length > 0 && (
                <div>
                  <div className="t-meta" style={{ fontWeight: 600, marginBottom: 4 }}>후보 ({(result.candidates ?? []).length})</div>
                  <div style={{ maxHeight: 280, overflowY: "auto" }}>
                    {(result.candidates ?? []).map((c, i) => (
                      <div key={i} className="t-mini" style={{ padding: "4px 0", borderBottom: "1px solid var(--c-border)" }}>
                        <span className="font-mono" style={{ color: "var(--c-accent-500)" }}>{c.legacy_code}</span>{" "}
                        {c.item_name} · {c.sub_type ?? "-"} · {c.spec ?? "-"}
                        {typeof c.matched_keys === "number" && <span style={{ color: "var(--c-text-sub)" }}> · 일치 {c.matched_keys}/{c.provided_keys}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {result.note && <div className="t-mini" style={{ color: "var(--c-text-sub)" }}>{result.note}</div>}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .form-card { background:#fff; border:1px solid var(--c-border); border-radius:10px; padding:16px; }
        .fld { display:flex; flex-direction:column; gap:4px; font-size: var(--app-fs-sm); }
        .fld > span { color: var(--c-text-sub); font-weight:600; }
        .fld input, .fld select { border:1px solid var(--c-border); border-radius:6px; padding:7px 9px; font-size: var(--app-fs-sm); color: var(--c-text); }
        .fld input:focus, .fld select:focus { outline:none; border-color: var(--c-navy-600); }
      `}</style>
    </section>
  );
}
