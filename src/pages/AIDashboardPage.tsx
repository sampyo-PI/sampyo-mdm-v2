export function AIDashboardPage() {
  const usageData = [42, 38, 51, 47, 63, 28, 19];
  const maxVal = Math.max(...usageData);
  const chartH = 160;
  const chartW = 700;
  const padX = 30;
  const padY = 20;
  const stepX = (chartW - padX * 2) / (usageData.length - 1);
  const points = usageData.map((v, i) => {
    const x = padX + i * stepX;
    const y = padY + (chartH - padY * 2) * (1 - v / maxVal);
    return { x, y, v };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartH - padY} L ${points[0].x} ${chartH - padY} Z`;

  return (
    <section className="page-card">
      <div className="page-h">
        <div>
          <h1>AI 시스템 현황 <span className="text-xs text-gray-500 font-normal ml-2">/ ai/dashboard</span></h1>
          <div className="meta">분류 마스터 상태 · AI 사용량 · 최근 24h LIVE</div>
        </div>
        <div className="actions">
          <button className="btn-sec">🔄 새로고침</button>
        </div>
      </div>

      <div className="section-title">분류 마스터</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
        <div className="kpi"><div className="label">대분류</div><div className="val">15</div></div>
        <div className="kpi"><div className="label">중분류</div><div className="val">98</div></div>
        <div className="kpi"><div className="label">소분류</div><div className="val">652</div></div>
        <div className="kpi accent"><div className="label">매핑 완료</div><div className="val">652<span className="text-xs text-gray-500 font-normal ml-1">/ 652</span></div><div className="delta" style={{ color: "#16a34a" }}>100% ✓</div></div>
        <div className="kpi"><div className="label">총 속성 매핑</div><div className="val">4,770</div></div>
        <div className="kpi"><div className="label">전체 품목 (활성)</div><div className="val">29,977</div></div>
      </div>

      <div className="section-title" style={{ marginTop: 24 }}>AI 사용량 (최근 7일)</div>
      <div className="page-card" style={{ marginBottom: 0, padding: 20 }}>
        <svg viewBox={`0 0 ${chartW} ${chartH + 28}`} style={{ width: "100%", height: "auto", display: "block" }}>
          <defs>
            <linearGradient id="usageArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#003876" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#003876" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((r) => {
            const y = padY + (chartH - padY * 2) * (1 - r);
            return <line key={r} x1={padX} y1={y} x2={chartW - padX} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />;
          })}
          <path d={areaPath} fill="url(#usageArea)" />
          <path d={linePath} fill="none" stroke="#003876" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <g key={i}>
              <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill="#003876">{p.v}</text>
              <circle cx={p.x} cy={p.y} r="2.5" fill="#fff" stroke="#003876" strokeWidth="1.4" />
            </g>
          ))}
          {points.map((p, i) => {
            const date = new Date(); date.setDate(date.getDate() - (usageData.length - 1 - i));
            const label = `${date.getMonth() + 1}/${date.getDate()}`;
            return (
              <text key={`d-${i}`} x={p.x} y={chartH + 14} textAnchor="middle" fontSize="11" fontWeight="500" fill="#64748b">{label}</text>
            );
          })}
        </svg>
        <div style={{ display: "flex", justifyContent: "space-around", marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--c-border)" }}>
          <div className="text-xs"><span style={{ color: "var(--c-text-sub)" }}>7일 합계</span> <strong style={{ color: "var(--c-text)" }}>288건</strong></div>
          <div className="text-xs"><span style={{ color: "var(--c-text-sub)" }}>일평균</span> <strong style={{ color: "var(--c-text)" }}>41건</strong></div>
          <div className="text-xs"><span style={{ color: "var(--c-text-sub)" }}>평균 응답시간</span> <strong style={{ color: "var(--c-text)" }}>2.3s</strong></div>
          <div className="text-xs"><span style={{ color: "var(--c-text-sub)" }}>토큰 사용량</span> <strong style={{ color: "var(--c-text)" }}>1.24M</strong></div>
        </div>
      </div>

    </section>
  );
}
