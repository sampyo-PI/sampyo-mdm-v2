export function AIQualityPage() {
  return (
    <section className="page-card">
      <div className="page-h">
        <div>
          <h1>AI 분류 정확도 <span className="text-xs text-gray-500 font-normal ml-2">/ ai/quality</span></h1>
          <div className="meta">신뢰도 분포 · 검토자 정정 패턴 · 중복 위험 분석 (최근 30일 기준)</div>
        </div>
        <div className="actions">
          <select style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: "var(--app-fs)" }}>
            <option>최근 30일</option>
            <option>최근 7일</option>
            <option>최근 90일</option>
          </select>
          <button className="btn-sec">⬇ 리포트 다운로드</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
        <div className="kpi"><div className="label">총 분석 건수</div><div className="val">1,247</div><div className="delta" style={{ color: "#16a34a" }}>▲ 18% (7d)</div></div>
        <div className="kpi accent"><div className="label">평균 분류 신뢰도</div><div className="val">87%</div><div className="delta" style={{ color: "#16a34a" }}>▲ 2.3p</div></div>
        <div className="kpi"><div className="label">평균 중복 가능성</div><div className="val">12%</div><div className="delta" style={{ color: "#dc2626" }}>▼ 3.1p</div></div>
        <div className="kpi"><div className="label">검토자 수정률</div><div className="val">9.4%</div><div className="delta" style={{ color: "#16a34a" }}>▼ 1.2p</div></div>
        <div className="kpi"><div className="label">속성 추출률</div><div className="val">94%</div></div>
        <div className="kpi"><div className="label">최종 승인률</div><div className="val">92%</div></div>
      </div>

      <div className="section-title" style={{ marginTop: 24 }}>신뢰도 분포 (분류 카드 기준)</div>
      <div className="page-card" style={{ marginBottom: 0, padding: 20 }}>
        <div style={{ display: "flex", gap: 4, alignItems: "stretch", height: 80 }}>
          {[
            { label: "95~100%", count: 412, color: "#16a34a" },
            { label: "85~95%", count: 384, color: "#22c55e" },
            { label: "70~85%", count: 248, color: "#84cc16" },
            { label: "50~70%", count: 142, color: "#facc15" },
            { label: "30~50%", count: 41, color: "#f59e0b" },
            { label: "<30%", count: 20, color: "#dc2626" },
          ].map((b, i) => (
            <div key={i} style={{ flex: b.count, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <div style={{ background: b.color, height: "100%", borderRadius: 4, position: "relative" }}>
                <span className="text-xs" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "#fff", fontWeight: 700 }}>{b.count}</span>
              </div>
              <div className="text-xs" style={{ textAlign: "center", color: "var(--c-text-sub)", marginTop: 6 }}>{b.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 24 }}>⚠ AI가 자신 없어한 신청 (신뢰도 50% 미만, 최근 20건)</div>
      <table className="attr-table">
        <thead>
          <tr>
            <th>요청번호</th>
            <th>품목명</th>
            <th>AI 분류</th>
            <th style={{ width: 90 }}>신뢰도</th>
            <th style={{ width: 100 }}>최종 결정</th>
          </tr>
        </thead>
        <tbody>
          {[
            { no: "R2605270014", name: "특수 패킹 (PNC 외주품)", cat: "안전용품 > 개인안전장비 > 기타", conf: 32, decision: "REJECT" },
            { no: "R2605260008", name: "BCT BLOWER MOTOR 75kW", cat: "기계부속 > 모터 > 송풍기모터", conf: 41, decision: "APPROVED" },
            { no: "R2605260002", name: "라바콘 보강대", cat: "안전용품 > 안전표지 > 라바콘", conf: 38, decision: "ESCALATE" },
            { no: "R2605250015", name: "벨트컨베이어 풀리 #44", cat: "기계부속 > 수송장치 > 컨베이어 드럼", conf: 47, decision: "APPROVED" },
          ].map((r) => (
            <tr key={r.no}>
              <td><a href={`#${r.no}`} style={{ color: "var(--c-accent-500)" }}>{r.no}</a></td>
              <td>{r.name}</td>
              <td className="text-xs">{r.cat}</td>
              <td><span className="text-xs font-bold" style={{ color: "#dc2626" }}>{r.conf}%</span></td>
              <td>
                <span className={`badge ${r.decision === "APPROVED" ? "b-approve" : r.decision === "REJECT" ? "b-error" : "b-warn"}`}>
                  {r.decision}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="section-title" style={{ marginTop: 24 }}>🔧 검토자가 자주 고치는 항목 (Top 8)</div>
      <table className="attr-table">
        <thead>
          <tr>
            <th>필드</th>
            <th style={{ width: 120 }}>수정 횟수</th>
            <th style={{ width: 120 }}>전체 대비</th>
            <th>전형적인 변경 패턴</th>
          </tr>
        </thead>
        <tbody>
          {[
            { field: "soft_category", n: 84, pct: 6.7, pattern: "기타 → 구체적 소분류로 정정" },
            { field: "attributes[규격]", n: 62, pct: 5.0, pattern: "단위 누락 보완" },
            { field: "normalized_name", n: 41, pct: 3.3, pattern: "축약어 → 정식 표기 (예: KM → 킬로미터)" },
            { field: "maker", n: 28, pct: 2.2, pattern: "오타 / 영문 → 한글" },
            { field: "model", n: 19, pct: 1.5, pattern: "특수문자 정규화" },
            { field: "spec", n: 15, pct: 1.2, pattern: "공백 정리" },
            { field: "equipment_name", n: 11, pct: 0.9, pattern: "전체 → 구체 설비명" },
            { field: "unit", n: 8, pct: 0.6, pattern: "EA → 정확한 UOM" },
          ].map((r) => (
            <tr key={r.field}>
              <td className="mono text-xs">{r.field}</td>
              <td><strong>{r.n}</strong></td>
              <td><span className="text-xs" style={{ color: "var(--c-text-sub)" }}>{r.pct}%</span></td>
              <td className="text-xs">{r.pattern}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </section>
  );
}
