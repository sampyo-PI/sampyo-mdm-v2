import { useMemo, useState } from "react";

type Cat = { code: string; name: string; en: string };
type SmallCat = Cat & { stock_unit?: string; account?: string; klass?: string; fieldTerms?: string[] };

const LARGES: Cat[] = [
  { code: "M", name: "기계부속", en: "Machine Parts" },
  { code: "E", name: "전기부속", en: "Electrical Parts" },
  { code: "S", name: "안전용품", en: "Safety Supplies" },
  { code: "N", name: "건설자재", en: "Construction Materials" },
  { code: "G", name: "일반자재", en: "General Supplies" },
  { code: "I", name: "철강자재", en: "Steel Materials" },
  { code: "L", name: "유지류", en: "Lubricants and Oils" },
  { code: "W", name: "원부원료", en: "Raw Materials" },
  { code: "F", name: "연료", en: "Fuel" },
  { code: "D", name: "공기구", en: "Hand Tools" },
  { code: "B", name: "강구", en: "Steel Balls" },
  { code: "K", name: "포장적재자재", en: "Packaging" },
  { code: "Q", name: "시험자재", en: "Test Materials" },
  { code: "R", name: "연와", en: "Refractory Bricks" },
  { code: "H", name: "화약류", en: "Explosives" },
  { code: "X", name: "불용", en: "Obsolete Items" },
];

const MEDIUMS: Record<string, Cat[]> = {
  M: [
    { code: "EN", name: "엔진부속품", en: "Engine Parts" },
    { code: "EM", name: "모터", en: "Motor" },
    { code: "LB", name: "베어링", en: "Bearing" },
    { code: "RD", name: "감속기", en: "Reducer" },
    { code: "CV", name: "콘베이어", en: "Conveyor" },
    { code: "CG", name: "기어드", en: "Gear" },
    { code: "TR", name: "변속기", en: "Transmission" },
    { code: "CL", name: "클러치", en: "Clutch" },
  ],
  E: [
    { code: "BL", name: "전선", en: "Wire/Cable" },
    { code: "PS", name: "전원공급장치", en: "Power Supply" },
    { code: "PL", name: "PLC", en: "PLC" },
  ],
  S: [
    { code: "PP", name: "개인보호구", en: "PPE" },
    { code: "SG", name: "안전표지", en: "Safety Sign" },
  ],
};

const SMALLS: Record<string, SmallCat[]> = {
  EN: [
    { code: "ENG", name: "엔진부속품", en: "Engine Parts", stock_unit: "EA – 개", account: "33 – 저장품", klass: "01 – 일반자재", fieldTerms: ["엔진부품", "모터부품", "엔진소모품"] },
    { code: "CYL", name: "실린더·헤드", en: "Cylinder/Head", stock_unit: "EA – 개", account: "33 – 저장품", klass: "01 – 일반자재", fieldTerms: ["실린더헤드", "헤드"] },
    { code: "CRK", name: "크랭크·캠", en: "Crank/Cam", stock_unit: "EA – 개", account: "33 – 저장품", klass: "01 – 일반자재", fieldTerms: ["크랭크", "캠샤프트"] },
    { code: "PST", name: "피스톤·링", en: "Piston/Ring", stock_unit: "EA – 개", account: "33 – 저장품", klass: "01 – 일반자재", fieldTerms: ["피스톤", "Piston"] },
    { code: "VLR", name: "밸브·로커", en: "Valve/Rocker", stock_unit: "EA – 개", account: "33 – 저장품", klass: "01 – 일반자재", fieldTerms: ["엔진밸브", "로커암"] },
    { code: "EOF", name: "엔진오일·필터", en: "Oil/Filter", stock_unit: "EA – 개", account: "33 – 저장품", klass: "01 – 일반자재", fieldTerms: ["오일필터", "엔진필터"] },
  ],
  EM: [
    { code: "MOT", name: "범용모터", en: "General Motor", stock_unit: "EA – 개", account: "33 – 저장품", klass: "02 – 기계", fieldTerms: ["범용모터", "전동기", "Motor"] },
    { code: "SVM", name: "서보모터", en: "Servo Motor", stock_unit: "EA – 개", account: "33 – 저장품", klass: "02 – 기계", fieldTerms: ["서보모터", "Servo"] },
  ],
  LB: [
    { code: "BER", name: "베어링", en: "Bearing", stock_unit: "EA – 개", account: "33 – 저장품", klass: "01 – 일반자재", fieldTerms: ["베어링", "볼베어링", "Bearing"] },
    { code: "BSH", name: "부싱", en: "Bushing", stock_unit: "EA – 개", account: "33 – 저장품", klass: "01 – 일반자재", fieldTerms: ["부싱", "Bushing"] },
  ],
};

const Panel = ({ title, count, items, selected, onSelect, parentLabel, search, setSearch }: {
  title: string; count: number; items: Cat[]; selected: string | null; onSelect: (code: string) => void;
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
        items.filter(c => !search || c.name.includes(search) || c.code.toLowerCase().includes(search.toLowerCase()) || c.en.toLowerCase().includes(search.toLowerCase())).map(c => (
          <div key={c.code} className={`cat-row ${selected === c.code ? "selected" : ""}`} onClick={() => onSelect(c.code)}>
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
  const [selL, setSelL] = useState<string | null>("M");
  const [selM, setSelM] = useState<string | null>("EN");
  const [selS, setSelS] = useState<string | null>("ENG");
  const [qL, setQL] = useState("");
  const [qM, setQM] = useState("");
  const [qS, setQS] = useState("");

  const mediums = useMemo(() => selL ? (MEDIUMS[selL] || []) : [], [selL]);
  const smalls = useMemo(() => selM ? (SMALLS[selM] || []) : [], [selM]);
  const largeRow = useMemo(() => LARGES.find(x => x.code === selL), [selL]);
  const medRow = useMemo(() => mediums.find(x => x.code === selM), [mediums, selM]);
  const smallRow = useMemo(() => smalls.find(x => x.code === selS), [smalls, selS]);

  const fullCode = smallRow ? `${largeRow?.code}·${medRow?.code}·${smallRow.code}` : null;

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>분류 체계<span className="text-xs text-gray-500 font-normal ml-2">/ classification/tree</span></h1>
          <div className="meta">대 16 / 중 138 / 소 652 분류 — 좌→우 드릴다운 · admin 권한 시 편집/추가</div>
        </div>
        <div className="actions">
          <button className="btn-sec">📊 분류체계 다운로드</button>
        </div>
      </div>

      <div className="cat-three">
        <Panel title="대분류" count={16} items={LARGES} selected={selL} onSelect={(c) => { setSelL(c); setSelM(null); setSelS(null); }} search={qL} setSearch={setQL} />
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
                <button className="btn-sec" style={{ fontSize: 12 }}>📋 활성 items (29)</button>
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
                  ({(smallRow.fieldTerms || []).length}건)
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn-sec" style={{ fontSize: 12 }}>＋ 추가</button>
                <button className="btn-sec" style={{ fontSize: 12, color: "#dc2626", borderColor: "#fca5a5" }}>🗑 삭제</button>
              </div>
            </div>
            {(smallRow.fieldTerms || []).length > 0 ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {smallRow.fieldTerms!.map((t, i) => <span key={i} className="term-chip">{t}</span>)}
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
