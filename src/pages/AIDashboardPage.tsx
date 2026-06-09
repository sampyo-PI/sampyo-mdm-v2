import { useQuery } from "@tanstack/react-query";
import { rpc } from "../lib/supabase";

type DashboardStats = {
  large_count: number;
  medium_count: number;
  small_count: number;
  mapped_small_count: number;
  total_attribute_mappings: number;
  active_items_count: number;
  usage_last7days: Array<{ date: string; count: number }>;
  usage_total_7d: number;
  active_users_7d: number;
  top_function_7d: string | null;
};

function fmtNum(n: number | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("ko-KR");
}

function buildLast7Days(usage: Array<{ date: string; count: number }>): number[] {
  // 7일 배열 0으로 초기화 후 일자별 count 채움 (가장 오래된 날 → 오늘)
  const arr = new Array(7).fill(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  const map = new Map(usage.map((u) => [u.date, u.count]));
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getTime() - (6 - i) * dayMs);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    arr[i] = map.get(key) ?? 0;
  }
  return arr;
}

export function AIDashboardPage() {
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["ai-dashboard-stats"],
    queryFn: () => rpc<DashboardStats>("get_ai_dashboard_stats"),
    staleTime: 60_000,
  });

  const usageData = buildLast7Days(data?.usage_last7days ?? []);
  const maxVal = Math.max(...usageData, 1);
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

  const mappingPct =
    data && data.small_count > 0 ? Math.round((data.mapped_small_count / data.small_count) * 100) : 0;
  const dailyAvg = data ? Math.round(data.usage_total_7d / 7) : 0;

  return (
    <section className="page-card">
      <div className="page-h">
        <div>
          <h1>AI 시스템 현황</h1>
        </div>
        <div className="actions">
          <button className="btn-sec" onClick={() => refetch()} disabled={isFetching}>
            🔄 {isFetching ? "갱신 중…" : "새로고침"}
          </button>
        </div>
      </div>

      <div className="section-title">분류 마스터</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
        <div className="kpi"><div className="label">대분류</div><div className="val">{fmtNum(data?.large_count)}</div></div>
        <div className="kpi"><div className="label">중분류</div><div className="val">{fmtNum(data?.medium_count)}</div></div>
        <div className="kpi"><div className="label">소분류</div><div className="val">{fmtNum(data?.small_count)}</div></div>
        <div className="kpi accent">
          <div className="label">매핑 완료</div>
          <div className="val">{fmtNum(data?.mapped_small_count)}<span className="text-xs text-gray-500 font-normal ml-1">/ {fmtNum(data?.small_count)}</span></div>
          <div className="delta" style={{ color: mappingPct === 100 ? "#16a34a" : "#f59e0b" }}>{mappingPct}% {mappingPct === 100 ? "✓" : ""}</div>
        </div>
        <div className="kpi"><div className="label">총 속성 매핑</div><div className="val">{fmtNum(data?.total_attribute_mappings)}</div></div>
        <div className="kpi"><div className="label">전체 품목 (활성)</div><div className="val">{fmtNum(data?.active_items_count)}</div></div>
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
          <div className="text-xs"><span style={{ color: "var(--c-text-sub)" }}>7일 합계</span> <strong style={{ color: "var(--c-text)" }}>{fmtNum(data?.usage_total_7d)}건</strong></div>
          <div className="text-xs"><span style={{ color: "var(--c-text-sub)" }}>일평균</span> <strong style={{ color: "var(--c-text)" }}>{fmtNum(dailyAvg)}건</strong></div>
          <div className="text-xs"><span style={{ color: "var(--c-text-sub)" }}>활성 사용자</span> <strong style={{ color: "var(--c-text)" }}>{fmtNum(data?.active_users_7d)}명</strong></div>
          <div className="text-xs"><span style={{ color: "var(--c-text-sub)" }}>최다 호출</span> <strong style={{ color: "var(--c-text)" }}>{data?.top_function_7d ?? "—"}</strong></div>
        </div>
      </div>

    </section>
  );
}
