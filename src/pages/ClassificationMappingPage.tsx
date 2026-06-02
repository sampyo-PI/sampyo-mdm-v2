import { useMemo, useState } from "react";

type Cat = { code: string; name: string };
type AttrMap = { code: string; name: string; sort_order: number; include_in_name: boolean; unit: string | null };

const LARGES: Cat[] = [
  { code: "M", name: "일반자재" }, { code: "E", name: "엔진/구동" }, { code: "K", name: "기계요소" },
  { code: "P", name: "배관·밸브" }, { code: "L", name: "전기·계장" }, { code: "S", name: "측정·계측" },
];
const MEDS: Record<string, Cat[]> = {
  E: [{ code: "EN", name: "엔진부속품" }, { code: "EM", name: "모터" }, { code: "RD", name: "감속기" }],
  M: [{ code: "LN", name: "라인" }, { code: "LB", name: "베어링" }, { code: "LM", name: "모터" }],
  K: [{ code: "CV", name: "콘베이어" }, { code: "CG", name: "기어드" }, { code: "SL", name: "실린더" }],
};
const SMALLS: Record<string, Cat[]> = {
  EN: [{ code: "PSN", name: "피스톤" }, { code: "CYL", name: "실린더헤드" }, { code: "BLK", name: "엔진블록" }, { code: "FLT", name: "엔진오일필터" }],
  EM: [{ code: "MOT", name: "범용모터" }, { code: "SVM", name: "서보모터" }],
  LB: [{ code: "BER", name: "베어링" }, { code: "BSH", name: "부싱" }],
  LM: [{ code: "MOT", name: "송풍기모터" }],
};

const MAPPING: Record<string, AttrMap[]> = {
  MOT: [
    { code: "OUTPUT-KW", name: "출력", sort_order: 1, include_in_name: true, unit: "kW" },
    { code: "VOLT-V", name: "전압", sort_order: 2, include_in_name: true, unit: "V" },
    { code: "RPM", name: "회전수", sort_order: 3, include_in_name: false, unit: "rpm" },
    { code: "POLE", name: "극수", sort_order: 4, include_in_name: false, unit: null },
    { code: "MAT", name: "재질", sort_order: 5, include_in_name: false, unit: null },
  ],
  BER: [
    { code: "BORE-MM", name: "내경", sort_order: 1, include_in_name: true, unit: "mm" },
    { code: "OUTER-MM", name: "외경", sort_order: 2, include_in_name: true, unit: "mm" },
    { code: "THICK-MM", name: "두께", sort_order: 3, include_in_name: false, unit: "mm" },
    { code: "SEAL-TYPE", name: "씰 형식", sort_order: 4, include_in_name: false, unit: null },
  ],
};

export function ClassificationMappingPage() {
  const [expL, setExpL] = useState<Set<string>>(new Set(["E", "M"]));
  const [expM, setExpM] = useState<Set<string>>(new Set(["EN", "LB"]));
  const [selSmall, setSelSmall] = useState<{ code: string; name: string; path: string } | null>({ code: "MOT", name: "범용모터", path: "엔진/구동 ▸ 모터 ▸ 범용모터" });

  const toggleL = (c: string) => {
    const n = new Set(expL); n.has(c) ? n.delete(c) : n.add(c); setExpL(n);
  };
  const toggleM = (c: string) => {
    const n = new Set(expM); n.has(c) ? n.delete(c) : n.add(c); setExpM(n);
  };

  const mapping = useMemo(() => selSmall ? (MAPPING[selSmall.code] || []) : [], [selSmall]);

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>분류-속성 매핑<span className="text-xs text-gray-500 font-normal ml-2">/ classification/mapping</span></h1>
          <div className="meta">소분류 1개당 속성 매핑 + 품목명 생성 규칙 (include_in_name) — 좌측 트리 선택 후 우측에서 편집</div>
        </div>
      </div>

      <div className="map-layout">
        <div className="map-card tree-card">
          <div className="card-h">
            <div className="title">분류 체계</div>
            <span className="t-meta">대 16 / 중 138 / 소 652</span>
          </div>
          <div className="search-box">
            <input type="search" placeholder="소분류 검색…" />
          </div>
          <div className="tree-list">
            {LARGES.map(L => (
              <div key={L.code}>
                <div className="tree-node lvl-1" onClick={() => toggleL(L.code)}>
                  <span className="caret">{expL.has(L.code) ? "▼" : "▶"}</span>
                  <span className="t-code">{L.code}</span>
                  <span className="t-name">{L.name}</span>
                </div>
                {expL.has(L.code) && (MEDS[L.code] || []).map(M => (
                  <div key={M.code}>
                    <div className="tree-node lvl-2" onClick={() => toggleM(M.code)}>
                      <span className="caret">{expM.has(M.code) ? "▼" : "▶"}</span>
                      <span className="t-code">{M.code}</span>
                      <span className="t-name">{M.name}</span>
                    </div>
                    {expM.has(M.code) && (SMALLS[M.code] || []).map(S => (
                      <div key={S.code}
                        className={`tree-node lvl-3 ${selSmall?.code === S.code ? "selected" : ""}`}
                        onClick={() => setSelSmall({ code: S.code, name: S.name, path: `${L.name} ▸ ${M.name} ▸ ${S.name}` })}>
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
                <button className="btn-primary">＋ 속성 추가</button>
              </div>

              <div className="info-strip">
                💡 sort_order 1~2는 보통 <strong>include_in_name=true</strong> (품목명 자동 생성에 사용). 드래그로 순서 변경.
              </div>

              {mapping.length === 0 ? (
                <div className="empty-state">
                  <div className="ic">🔗</div>
                  <div>이 소분류에 매핑된 속성이 없습니다</div>
                  <button className="btn-primary" style={{ marginTop: 12 }}>+ 속성 매핑 추가</button>
                </div>
              ) : (
                <div className="attr-list">
                  {mapping.map(a => (
                    <div key={a.code} className="attr-item">
                      <span className="grip"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></svg></span>
                      <span className="seq">#{a.sort_order}</span>
                      <span className="attr-code">{a.code}</span>
                      <span className="attr-name">{a.name}</span>
                      {a.unit && <span className="attr-unit">{a.unit}</span>}
                      <label className="ck-include">
                        <input type="checkbox" checked={a.include_in_name} readOnly />
                        <span>품목명 포함</span>
                      </label>
                      <button className="del-btn"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1.5 14a2 2 0 0 1-2 2H8.5a2 2 0 0 1-2-2L5 6"/></svg></button>
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
    </section>
  );
}

const PAGE_STYLES = `
.map-layout { display: grid; grid-template-columns: 380px 1fr; gap: 12px; margin-top: 16px; }
.map-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; min-height: 600px; max-height: 720px; }
.card-h { padding: 14px 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.card-h .title { font-size: 15px; font-weight: 700; color: #003876; }

.tree-card .search-box { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
.tree-card .search-box input { width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; }
.tree-card .search-box input:focus { outline: none; border-color: #003876; }
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
.info-strip { background: #eff6ff; padding: 8px 16px; font-size: 12px; color: #1e293b; border-bottom: 1px solid #e2e8f0; }
.attr-list { flex: 1; overflow-y: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; }
.attr-item { display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; transition: border-color 0.1s; }
.attr-item:hover { border-color: #003876; }
.attr-item .grip { color: #94a3b8; cursor: grab; display: flex; }
.attr-item .grip:active { cursor: grabbing; }
.attr-item .grip svg { width: 16px; height: 16px; }
.attr-item .seq { font-family: ui-monospace, monospace; color: #64748b; font-size: 12px; font-weight: 600; }
.attr-item .attr-code { padding: 1px 7px; background: #f1f5f9; color: #003876; border: 1px solid #cbd5e1; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 11px; font-weight: 600; }
.attr-item .attr-name { font-size: 14px; font-weight: 600; color: #1f2937; flex: 1; }
.attr-item .attr-unit { font-size: 11px; color: #64748b; font-family: ui-monospace, monospace; background: #fef3c7; padding: 1px 6px; border-radius: 4px; border: 1px solid #fde68a; }
.attr-item .ck-include { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; color: #475569; }
.attr-item .ck-include input { width: 14px; height: 14px; accent-color: #003876; }
.attr-item .del-btn { width: 28px; height: 28px; border-radius: 4px; border: none; background: transparent; color: #94a3b8; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.attr-item .del-btn:hover { background: #fef2f2; color: #b91c1c; }
.attr-item .del-btn svg { width: 14px; height: 14px; }

.empty-state { padding: 60px 20px; text-align: center; color: #94a3b8; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.empty-state .ic { font-size: 36px; opacity: 0.4; margin-bottom: 10px; }

.t-meta { font-size: 12px; color: #64748b; font-weight: 500; }
`;
