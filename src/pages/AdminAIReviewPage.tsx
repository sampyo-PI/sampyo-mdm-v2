export function AdminAIReviewPage() {
  return (
    <section className="page-card">
      <div className="page-h">
        <div>
          <h1>AI 1차 검토 통계 <span className="text-xs text-gray-500 font-normal ml-2">/ admin/ai-review</span></h1>
          <div className="meta">전 법인 Production 모드 (2026-05-12~) · C1~C8 통과율 · ESCALATED 패턴</div>
        </div>
        <div className="actions">
          <select style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: "var(--app-fs)" }}>
            <option>최근 7일</option>
            <option>최근 30일</option>
            <option>전체 기간</option>
          </select>
        </div>
      </div>

      {/* 알림 */}
      <div className="callout warn" style={{ marginBottom: 16 }}>
        <div className="ct-title">⚠ 3일 초과 보완 요청 — 신청자 미응답 3건</div>
        <ul style={{ margin: "8px 0 0 0", paddingLeft: 20, fontSize: "var(--app-fs-sm)" }}>
          <li>R2605240003 — 권혁수 (구매팀) · 4일 경과</li>
          <li>R2605230011 — 박상필 (생산팀) · 5일 경과</li>
          <li>R2605220007 — 김미경 (품질팀) · 6일 경과</li>
        </ul>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <div className="kpi"><div className="label">총 AI 검토</div><div className="val">842</div><div className="delta" style={{ color: "var(--c-text-sub)" }}>최근 7일</div></div>
        <div className="kpi accent"><div className="label">자동 승인 (PR2)</div><div className="val">621</div><div className="delta" style={{ color: "#16a34a" }}>73.8%</div></div>
        <div className="kpi"><div className="label">자동 반려</div><div className="val">94</div><div className="delta" style={{ color: "#dc2626" }}>11.2%</div></div>
        <div className="kpi"><div className="label">ESCALATE</div><div className="val">87</div><div className="delta" style={{ color: "#d97706" }}>10.3%</div></div>
        <div className="kpi"><div className="label">평균 처리시간</div><div className="val">3.2<span className="text-xs font-normal ml-1">s</span></div><div className="delta" style={{ color: "#16a34a" }}>▼ 0.4s</div></div>
      </div>

      <div className="section-title" style={{ marginTop: 24 }}>C1~C8 체크리스트 — 통과율</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {[
          { code: "C1", label: "입력 충분성", pct: 89, desc: "품목명·제조사·모델 등 최소 필드 충족" },
          { code: "C2", label: "분류 신뢰도", pct: 92, desc: "대/중/소 분류 confidence ≥ 70%" },
          { code: "C3", label: "속성 채움률", pct: 78, desc: "소분류 필수 속성 채움 (filled ≥ 3)" },
          { code: "C4", label: "분류 일치", pct: 95, desc: "상위 1순위 vs 2순위 차이 ≥ 15p" },
          { code: "C5", label: "중복 위험", pct: 84, desc: "duplicate_risk_score < 60" },
          { code: "C6", label: "최종 권고", pct: 88, desc: "C1~C5 종합 → APPROVE / REJECT / ESCALATE" },
          { code: "C7", label: "검토자 위임", pct: 96, desc: "회사·소분류 매핑된 검토자 존재" },
          { code: "C8", label: "워크플로우 진입", pct: 99, desc: "status 전환 + erp_pending 큐 등록" },
        ].map((c) => (
          <div key={c.code} className="page-card" style={{ marginBottom: 0, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="badge b-approve" style={{ fontSize: "var(--app-fs-sm)", fontWeight: 700 }}>{c.code}</span>
              <span style={{ fontWeight: 600 }}>{c.label}</span>
              <span style={{ flex: 1 }}></span>
              <span className="text-xs" style={{ fontWeight: 700, color: c.pct >= 90 ? "#16a34a" : c.pct >= 80 ? "#d97706" : "#dc2626" }}>{c.pct}%</span>
            </div>
            <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
              <div style={{ width: `${c.pct}%`, height: "100%", background: c.pct >= 90 ? "#16a34a" : c.pct >= 80 ? "#f59e0b" : "#dc2626" }}></div>
            </div>
            <div className="text-xs" style={{ color: "var(--c-text-sub)", marginTop: 8 }}>{c.desc}</div>
          </div>
        ))}
      </div>

      <div className="section-title" style={{ marginTop: 24 }}>최근 AI 결정 로그 (20건)</div>
      <table className="attr-table">
        <thead>
          <tr>
            <th style={{ width: 120 }}>요청번호</th>
            <th>품목명</th>
            <th style={{ width: 90 }}>법인</th>
            <th style={{ width: 110 }}>AI 결정</th>
            <th>실패 체크</th>
            <th style={{ width: 90 }}>처리시간</th>
            <th style={{ width: 130 }}>일시</th>
          </tr>
        </thead>
        <tbody>
          {[
            { no: "R2605290001", name: "베어링", co: "SPI", dec: "REJECT", checks: "C6:REJECT, C1:ESCALATE, C3:ESCALATE", ms: 2840, at: "오늘 09:26" },
            { no: "R2605280014", name: "NBR 안전장갑 슈퍼그립쿨", co: "SPI", dec: "APPROVE", checks: "—", ms: 3120, at: "어제 14:33" },
            { no: "R2605280011", name: "원심펌프 5HP 2P", co: "TYC", dec: "APPROVE", checks: "—", ms: 2980, at: "어제 11:08" },
            { no: "R2605280008", name: "기어드 모터 PCV 2.2kW", co: "SPRC", dec: "ESCALATE", checks: "C3:ESCALATE (filled=2/5)", ms: 4210, at: "어제 09:42" },
            { no: "R2605270017", name: "유압 펌프 (수동 입력)", co: "SPRMC", dec: "ESCALATE", checks: "C4:ESCALATE (top1 vs top2 차이 8p)", ms: 3540, at: "5/27 17:21" },
          ].map((r) => (
            <tr key={r.no}>
              <td><a href={`#${r.no}`} style={{ color: "var(--c-accent-500)" }} className="mono text-xs">{r.no}</a></td>
              <td>{r.name}</td>
              <td className="text-xs mono">{r.co}</td>
              <td>
                <span className={`badge ${r.dec === "APPROVE" ? "b-approve" : r.dec === "REJECT" ? "b-error" : "b-warn"}`}>
                  {r.dec}
                </span>
              </td>
              <td className="text-xs">{r.checks}</td>
              <td className="text-xs">{r.ms}ms</td>
              <td className="text-xs" style={{ color: "var(--c-text-sub)" }}>{r.at}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-xs" style={{ color: "var(--c-text-sub)", marginTop: 16 }}>
        ⓘ 더 자세한 통계는 <a href="/v2/ai/quality" style={{ color: "var(--c-accent-500)" }}>AI 분류 정확도</a>에서 확인하세요.
      </div>

    </section>
  );
}
