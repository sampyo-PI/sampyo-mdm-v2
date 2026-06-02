import { useState } from "react";

type Tone = "ok" | "warn" | "fallback" | "danger";
type SeriesRow = {
  name: string;
  code: string;
  members: Array<{ code: string; override: boolean }>;
  review2: string[];
  review3: string[];
  aiOn: boolean;
  dirty?: boolean;
};
type CompanyOverrideRow = {
  name: string;
  series: string;
  review2: string[];
  review3: string[];
  aiOn: boolean;
  dirty?: boolean;
  tone: Tone;
};

const SERIES_ROWS: SeriesRow[] = [
  {
    name: "삼표산업 계열", code: "SPI_GROUP",
    members: [{ code: "SPI", override: false }, { code: "NRC", override: false }],
    review2: ["생산기술팀", "설비팀"], review3: ["구매팀"], aiOn: true, dirty: true,
  },
  {
    name: "시멘트 계열", code: "CEMENT_GROUP",
    members: [{ code: "TYC", override: false }, { code: "DAMUL", override: false }, { code: "SPRC", override: false }],
    review2: ["생산팀", "공무팀"], review3: ["구매팀"], aiOn: true,
  },
  {
    name: "네이처 계열", code: "NATURE_GROUP",
    members: [{ code: "NDW", override: false }, { code: "HM", override: false }, { code: "SPENR", override: false }, { code: "SPRMC", override: false }],
    review2: ["설비팀"], review3: ["구매팀"], aiOn: true,
  },
  {
    name: "피앤씨 계열", code: "PNC_GROUP",
    members: [{ code: "SPENC", override: true }, { code: "SPRAIL", override: true }, { code: "SPE", override: true }],
    review2: ["생산기술팀"], review3: ["구매2팀"], aiOn: true,
  },
];

const COMPANY_OVERRIDES: CompanyOverrideRow[] = [
  { name: "P&C (SPENC)", series: "피앤씨 계열", review2: ["품질관리팀"], review3: ["구매팀"], aiOn: true, tone: "ok" },
  { name: "레일웨이 (SPRAIL)", series: "피앤씨 계열", review2: ["설비기술팀", "생산팀"], review3: ["구매팀"], aiOn: false, dirty: true, tone: "ok" },
  { name: "팬트랙 (SPE)", series: "피앤씨 계열", review2: ["생산팀"], review3: [], aiOn: true, tone: "ok" },
];

const TeamPicker = ({ teams, placeholder = "팀 추가…" }: { teams: string[]; placeholder?: string }) => (
  <div className="team-picker">
    {teams.length === 0 && <span className="placeholder">팀 선택…</span>}
    {teams.map((t, i) => (
      <span key={i} className="chip">{t}<button>×</button></span>
    ))}
    {teams.length > 0 && <input placeholder={placeholder} />}
  </div>
);

const AIToggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
  <div className={`toggle ${on ? "on" : ""}`} onClick={onClick}>
    <div className="sw"></div>
    <span className="lbl">{on ? "ON" : "OFF"}</span>
  </div>
);

const StatusBadges = ({ tone, dirty }: { tone: Tone; dirty?: boolean }) => {
  const cls = tone === "ok" ? "status-ok" : tone === "warn" ? "status-warn" : tone === "fallback" ? "status-fallback" : "status-danger";
  const label = tone === "ok" ? "✓ 구성됨" : tone === "warn" ? "전사 폴백 사용" : tone === "fallback" ? "계열 폴백 사용" : "미설정 (위험)";
  return (
    <div className="target-status">
      <span className={`badge ${cls}`}>{label}</span>
      {dirty && <span className="badge dirty">수정됨</span>}
    </div>
  );
};

const ReviewerRowGroup = ({ children }: { children: React.ReactNode }) => (
  <table className="rv-tbl">
    <thead>
      <tr>
        <th style={{ width: 280 }}>대상 / 상태</th>
        <th>2차 검토팀 (생산/설비)</th>
        <th>3차 검토팀 (구매)</th>
        <th style={{ width: 90 }}>AI 1차</th>
        <th style={{ width: 130, textAlign: "right" }}>동작</th>
      </tr>
    </thead>
    <tbody>{children}</tbody>
  </table>
);

export function AdminReviewersPage() {
  const [series, setSeries] = useState(SERIES_ROWS);
  const [overrides] = useState(COMPANY_OVERRIDES);
  const dirtyCount = series.filter(s => s.dirty).length + overrides.filter(o => o.dirty).length;

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>
            검토자 설정
            <span className="text-xs text-gray-500 font-normal ml-2">/ admin/reviewers</span>
            {dirtyCount > 0 && <span className="badge dirty" style={{ marginLeft: 8 }}>미저장 변경 {dirtyCount}건</span>}
          </h1>
          <div className="meta">계열 · 회사 · 전사 3단 폴백 + AI 1차 검토 ON/OFF</div>
        </div>
        <div className="actions">
          <button className="btn-sec">↺ 변경 취소</button>
          <button className="btn-primary">💾 전체 저장</button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3" style={{ marginTop: 16 }}>
        <div className="stat-card">
          <div className="stat-label">계열 구성</div>
          <div className="stat-val">4 <small>/ 4</small></div>
          <div className="stat-sub">삼표산업 · 시멘트 · 네이처 · 피앤씨</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">회사 override</div>
          <div className="stat-val">3 <small>/ 15</small></div>
          <div className="stat-sub">계열과 다른 검토팀 필요한 회사만</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">AI 1차 활성</div>
          <div className="stat-val">5</div>
          <div className="stat-sub">계열 4 + 전사 fallback</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">전사 폴백</div>
          <div className="stat-val">✓ 정상</div>
          <div className="stat-sub">최후의 안전망 구성됨</div>
        </div>
        <div className="stat-card warn">
          <div className="stat-label">미배정 회사</div>
          <div className="stat-val">3</div>
          <div className="stat-sub">FTS · CHAM · SPSNA (계열·override 둘 다 없음)</div>
        </div>
      </div>

      <div className="priority-callout">
        <span style={{ color: "#64748b", fontWeight: 600 }}>🔗 폴백 우선순위:</span>
        <span className="step s1">1. 회사 override</span>
        <span className="arrow">→</span>
        <span className="step s2">2. 계열 default</span>
        <span className="arrow">→</span>
        <span className="step s3">3. 전사 fallback</span>
        <span style={{ flex: 1 }}></span>
        <span className="t-mini">신청건은 해당 단계 모든 팀에 노출, 누구나 처리 가능</span>
      </div>

      {/* 1) 계열별 */}
      <div className="section-card">
        <div className="section-h">
          <div className="sec-icon series">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          </div>
          <h2>계열별 (기본 단위)</h2>
          <span className="count-badge">4개</span>
          <span className="right">구성됨 4 / 4</span>
        </div>
        <p className="section-desc">같은 계열 소속 회사는 모두 이 설정을 공유합니다. <span className="member-chip override" style={{ margin: 0, padding: "0 5px" }}>노란 *</span> 표시는 회사별 override가 있어 계열 설정을 무시하는 회사.</p>

        <ReviewerRowGroup>
          {series.map((s, i) => (
            <tr key={s.code} className={s.dirty ? "dirty" : ""}>
              <td>
                <div className="target-name">{s.name} <span className="t-mini t-slate" style={{ fontWeight: 500 }}>{s.code}</span></div>
                <div>
                  {s.members.map(m => (
                    <span key={m.code} className={`member-chip ${m.override ? "override" : ""}`}>{m.code}</span>
                  ))}
                </div>
                <StatusBadges tone="ok" dirty={s.dirty} />
              </td>
              <td><TeamPicker teams={s.review2} /></td>
              <td><TeamPicker teams={s.review3} /></td>
              <td>
                <AIToggle on={s.aiOn} onClick={() => {
                  const copy = [...series]; copy[i] = { ...copy[i], aiOn: !copy[i].aiOn }; setSeries(copy);
                }} />
              </td>
              <td>
                <div className="row-acts">
                  <button className={s.dirty ? "save-on" : ""} disabled={!s.dirty}>{s.dirty ? "💾 저장" : "저장"}</button>
                </div>
              </td>
            </tr>
          ))}
        </ReviewerRowGroup>
      </div>

      {/* 2) 회사별 override */}
      <div className="section-card">
        <div className="section-h">
          <div className="sec-icon company">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>
          </div>
          <h2>회사별 override (선택)</h2>
          <span className="count-badge">3 / 15</span>
          <span className="right">계열과 다른 검토팀이 필요한 회사만 등록</span>
        </div>

        <div className="ov-toolbar">
          <input type="text" placeholder="회사명 / 코드 검색" />
          <label>
            <input type="checkbox" />
            전체 회사 표시 (미설정 포함)
          </label>
          <span style={{ flex: 1 }}></span>
          <button className="btn-sec">+ 회사 override 추가</button>
        </div>

        <ReviewerRowGroup>
          {overrides.map((o, i) => (
            <tr key={i} className={o.dirty ? "dirty" : ""}>
              <td>
                <div className="target-name">{o.name}</div>
                <div className="target-sublabel">
                  <svg style={{ display: "inline", width: 11, height: 11, verticalAlign: -1 }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/></svg>
                  {" "}{o.series}
                </div>
                <StatusBadges tone={o.tone} dirty={o.dirty} />
              </td>
              <td><TeamPicker teams={o.review2} /></td>
              <td><TeamPicker teams={o.review3} /></td>
              <td>
                <AIToggle on={o.aiOn} onClick={() => {}} />
              </td>
              <td>
                <div className="row-acts">
                  <button className={o.dirty ? "save-on" : ""} disabled={!o.dirty}>{o.dirty ? "💾 저장" : "저장"}</button>
                  <button className="del" title="override 삭제 → 계열 폴백 복귀">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </ReviewerRowGroup>

        <div className="t-mini" style={{ marginTop: 8 }}>🗑 휴지통 = override 삭제 → 해당 회사는 계열 폴백으로 복귀</div>
      </div>

      {/* 3) 전사 fallback */}
      <div className="section-card">
        <div className="section-h">
          <div className="sec-icon fallback">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </div>
          <h2>전사 fallback (최후 폴백)</h2>
          <span className="badge status-ok">✓ 정상</span>
        </div>
        <p className="section-desc">회사·계열 모두 비어 있을 때 사용하는 최종 폴백입니다. 반드시 1개 이상의 팀이 지정되어 있어야 합니다.</p>

        <ReviewerRowGroup>
          <tr>
            <td>
              <div className="target-name">전사 fallback</div>
              <div className="target-sublabel">모든 회사 / 계열의 최후 폴백</div>
              <StatusBadges tone="ok" />
            </td>
            <td><TeamPicker teams={["품질관리팀"]} /></td>
            <td><TeamPicker teams={["구매팀"]} /></td>
            <td><AIToggle on={true} onClick={() => {}} /></td>
            <td>
              <div className="row-acts"><button disabled>저장</button></div>
            </td>
          </tr>
        </ReviewerRowGroup>
      </div>

      <div className="t-mini" style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
        등록된 부서 24개 (사용자 프로필 기준 — HR API에서 동기화됨)
      </div>
    </section>
  );
}

const PAGE_STYLES = `
.stat-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; }
.stat-card .stat-label { font-size: 12px; color: #64748b; }
.stat-card .stat-val { font-size: 22px; font-weight: 700; color: #003876; line-height: 1.1; margin-top: 4px; }
.stat-card .stat-val small { font-size: 13px; font-weight: 500; color: #94a3b8; }
.stat-card .stat-sub { font-size: 11px; color: #94a3b8; margin-top: 4px; }
.stat-card.warn .stat-val { color: #b45309; }
.stat-card.success .stat-val { font-size: 16px; color: #047857; padding-top: 4px; }

.section-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; margin-top: 20px; padding: 18px; }
.section-h { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.section-h .sec-icon { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 6px; }
.section-h .sec-icon.series { background: #eff6ff; color: #003876; }
.section-h .sec-icon.company { background: #f5f3ff; color: #6d28d9; }
.section-h .sec-icon.fallback { background: #fef3c7; color: #92400e; }
.section-h h2 { font-size: 16px; font-weight: 700; color: #1f2937; margin: 0; }
.section-h .count-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
.section-h .right { margin-left: auto; font-size: 12px; color: #64748b; }
.section-desc { font-size: 12px; color: #64748b; margin: 0 0 14px 0; line-height: 1.5; }

.rv-tbl { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
.rv-tbl thead th { background: #f1f5f9; color: #003876; font-size: 12px; font-weight: 700; text-align: left; padding: 10px 12px; border-bottom: 1px solid #cbd5e1; white-space: nowrap; }
.rv-tbl tbody tr { border-bottom: 1px solid #f1f5f9; }
.rv-tbl tbody tr:hover { background: #fafbfc; }
.rv-tbl tbody tr.dirty { background: #eff6ff; }
.rv-tbl tbody td { padding: 14px 12px; vertical-align: top; color: #1f2937; font-size: 14px; }

.target-name { font-weight: 600; color: #1f2937; font-size: 14px; }
.target-sublabel { font-size: 11px; color: #94a3b8; margin-top: 4px; line-height: 1.4; }
.target-status { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px; }

.badge { display: inline-flex; align-items: center; gap: 4px; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 600; line-height: 1.5; }
.badge.status-ok { background: #ecfdf5; color: #047857; border: 1px solid #bbf7d0; }
.badge.status-fallback { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
.badge.status-warn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.badge.status-danger { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.badge.dirty { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }

.member-chip { display: inline-flex; align-items: center; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 500; background: #fff; color: #475569; border: 1px solid #e2e8f0; margin-right: 3px; margin-top: 2px; }
.member-chip.override { background: #fef3c7; color: #92400e; border-color: #fde68a; }
.member-chip.override::after { content: "*"; font-weight: 700; margin-left: 2px; opacity: 0.7; }

.team-picker { display: flex; flex-wrap: wrap; gap: 4px; min-height: 36px; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; cursor: text; }
.team-picker:focus-within { border-color: #003876; box-shadow: 0 0 0 2px rgba(0,56,118,0.1); }
.team-picker .chip { display: inline-flex; align-items: center; gap: 4px; background: #eff6ff; color: #003876; border: 1px solid #bfdbfe; border-radius: 4px; padding: 1px 7px; font-size: 12px; font-weight: 500; line-height: 1.5; }
.team-picker .chip button { background: none; border: none; cursor: pointer; color: #003876; font-size: 12px; padding: 0; opacity: 0.6; }
.team-picker .chip button:hover { opacity: 1; }
.team-picker input { flex: 1; min-width: 90px; border: none; outline: none; font-size: 13px; color: #1f2937; }
.team-picker .placeholder { color: #94a3b8; font-size: 12px; padding: 4px; }

.toggle { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.toggle .sw { width: 32px; height: 18px; border-radius: 999px; background: #cbd5e1; position: relative; cursor: pointer; transition: background 0.15s; }
.toggle .sw::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.2); transition: left 0.15s; }
.toggle.on .sw { background: #047857; }
.toggle.on .sw::after { left: 16px; }
.toggle .lbl { font-size: 11px; font-weight: 600; color: #64748b; }
.toggle.on .lbl { color: #047857; }

.row-acts { display: flex; gap: 4px; justify-content: flex-end; }
.row-acts button { height: 32px; padding: 0 12px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; border-radius: 6px; color: #475569; font-size: 12px; font-weight: 500; display: inline-flex; align-items: center; justify-content: center; gap: 4px; }
.row-acts button:hover { background: #eff6ff; color: #003876; border-color: #003876; }
.row-acts button.save-on { background: #003876; color: #fff; border-color: #003876; }
.row-acts button.save-on:hover { background: #002a5c; }
.row-acts button.del { width: 32px; padding: 0; color: #b91c1c; }
.row-acts button.del:hover { background: #fef2f2; border-color: #fecaca; }
.row-acts button:disabled { opacity: 0.4; cursor: not-allowed; }
.row-acts svg { width: 13px; height: 13px; }

.ov-toolbar { display: flex; align-items: center; gap: 12px; margin: 10px 0 14px 0; flex-wrap: wrap; }
.ov-toolbar input[type="text"] { padding: 7px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; max-width: 260px; }
.ov-toolbar input[type="text"]:focus { outline: none; border-color: #003876; }
.ov-toolbar label { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #64748b; cursor: pointer; }
.ov-toolbar input[type="checkbox"] { width: 14px; height: 14px; cursor: pointer; }

.btn-primary { background: #003876; color: #fff; border: 1px solid #003876; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.btn-primary:hover { background: #002a5c; }
.btn-sec { background: #fff; color: #003876; border: 1px solid #cbd5e1; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-sec:hover { background: #eff6ff; border-color: #003876; }

.priority-callout { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-top: 14px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 13px; }
.priority-callout .step { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; background: #fff; border: 1px solid #cbd5e1; color: #1f2937; font-weight: 500; }
.priority-callout .step.s1 { border-color: #c4b5fd; background: #f5f3ff; color: #6d28d9; }
.priority-callout .step.s2 { border-color: #93c5fd; background: #eff6ff; color: #003876; }
.priority-callout .step.s3 { border-color: #fcd34d; background: #fef3c7; color: #92400e; }
.priority-callout .arrow { color: #94a3b8; }

.t-mini { font-size: 11px; font-weight: 600; color: #64748b; }
.t-slate { color: #64748b !important; }
.t-meta { font-size: 13px; font-weight: 500; color: #64748b; }
.t-navy { color: #003876 !important; }
`;
