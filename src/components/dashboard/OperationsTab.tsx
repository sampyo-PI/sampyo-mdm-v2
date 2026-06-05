import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { rpc } from "../../lib/supabase";

const PERIODS = [{ v: "7", l: "최근 7일" }, { v: "30", l: "최근 30일" }, { v: "90", l: "최근 90일" }, { v: "365", l: "최근 1년" }];
const PIE_COLORS = ["#003876", "#1a6bb5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1", "#14b8a6", "#a855f7", "#eab308", "#22c55e"];

type Daily = { day: string; created_cnt: number; revoked_cnt: number };
type ByLarge = { large_category: string; cnt: number };
type ByCompany = { company_code: string; company_name: string; cnt: number };

export function OperationsTab() {
  const [period, setPeriod] = useState("30");
  const { fromISO, toISO } = useMemo(() => {
    const to = new Date(); const from = new Date(); from.setDate(from.getDate() - parseInt(period));
    return { fromISO: from.toISOString().slice(0, 10), toISO: to.toISOString().slice(0, 10) };
  }, [period]);

  const { data: daily = [], isLoading: l1 } = useQuery({
    queryKey: ["dash-daily", fromISO, toISO],
    queryFn: () => rpc<Daily[]>("get_items_daily_changes", { p_from: fromISO, p_to: toISO }),
    staleTime: 60_000,
  });
  const { data: byLarge = [], isLoading: l2 } = useQuery({
    queryKey: ["dash-by-large"], queryFn: () => rpc<ByLarge[]>("get_items_by_large_category"), staleTime: 300_000,
  });
  const { data: byCompany = [], isLoading: l3 } = useQuery({
    queryKey: ["dash-by-company"], queryFn: () => rpc<ByCompany[]>("get_items_by_company"), staleTime: 300_000,
  });

  const totalCreated = daily.reduce((s, r) => s + Number(r.created_cnt), 0);
  const totalRevoked = daily.reduce((s, r) => s + Number(r.revoked_cnt), 0);
  const totalItems = byLarge.reduce((s, r) => s + Number(r.cnt), 0);

  return (
    <div>
      <style>{STYLES}</style>
      <div className="op-top">
        <div className="op-cards">
          <div className="kpi accent"><div className="label">활성 품목 총계</div><div className="val">{l2 ? "…" : totalItems.toLocaleString()}</div></div>
          <div className="kpi accent"><div className="label">기간 내 신규</div><div className="val">{l1 ? "…" : totalCreated.toLocaleString()}</div><div className="delta" style={{ color: "#16a34a" }}>▲ 신규 등록</div></div>
          <div className="kpi accent"><div className="label">기간 내 취소</div><div className="val">{l1 ? "…" : totalRevoked.toLocaleString()}</div><div className="delta" style={{ color: "#dc2626" }}>▼ 취소</div></div>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="op-period">
          {PERIODS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
      </div>

      <div className="op-card">
        <div className="op-h">품목 코드 증감 추이</div>
        {l1 ? <div className="op-empty">불러오는 중…</div> : <LineDual data={daily} />}
      </div>

      <div className="op-grid2">
        <div className="op-card">
          <div className="op-h">대분류별 활성 품목</div>
          {l2 ? <div className="op-empty">불러오는 중…</div> : <Donut data={byLarge.map((d) => ({ label: d.large_category, value: Number(d.cnt) }))} />}
        </div>
        <div className="op-card">
          <div className="op-h">법인별 활성 품목</div>
          {l3 ? <div className="op-empty">불러오는 중…</div> : <HBar data={[...byCompany].sort((a, b) => b.cnt - a.cnt).map((d) => ({ label: d.company_code, value: Number(d.cnt) }))} />}
        </div>
      </div>
    </div>
  );
}

function LineDual({ data }: { data: Daily[] }) {
  const w = 1000, h = 150, pl = 34, pr = 12, pt = 22, pb = 18;
  const n = data.length;
  const max = Math.max(1, ...data.flatMap((d) => [Number(d.created_cnt), Number(d.revoked_cnt)]));
  const x = (i: number) => pl + (n <= 1 ? 0 : (i / (n - 1)) * (w - pl - pr));
  const y = (v: number) => h - pb - (v / max) * (h - pt - pb);
  const path = (key: keyof Daily) => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(Number(d[key])).toFixed(1)}`).join(" ");
  const ticks = [0, Math.round(max / 2), max];
  const labelEvery = Math.max(1, Math.ceil(n / 12));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block", maxHeight: 200 }}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pl} y1={y(t)} x2={w - pr} y2={y(t)} stroke="#e2e8f0" strokeDasharray="3 3" />
          <text x={pl - 5} y={y(t) + 3} textAnchor="end" fontSize="8" fill="#94a3b8">{t}</text>
        </g>
      ))}
      {data.map((d, i) => i % labelEvery === 0 ? <text key={i} x={x(i)} y={h - 5} textAnchor="middle" fontSize="7.5" fill="#94a3b8">{d.day.slice(5)}</text> : null)}
      <path d={path("created_cnt")} fill="none" stroke="var(--c-navy-600)" strokeWidth="1.5" />
      <path d={path("revoked_cnt")} fill="none" stroke="#dc2626" strokeWidth="1.5" />
      <g transform={`translate(${pl},4)`} fontSize="8.5">
        <rect width="9" height="3" y="2" fill="var(--c-navy-600)" /><text x="13" y="7" fill="#475569">신규</text>
        <rect width="9" height="3" y="2" x="48" fill="#dc2626" /><text x="61" y="7" fill="#475569">취소</text>
      </g>
    </svg>
  );
}

function Donut({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 110, cy = 110, r = 92, ir = 56;
  let a0 = -Math.PI / 2;
  const arcs = data.map((d, i) => {
    const a1 = a0 + (d.value / total) * Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (ang: number, rad: number) => `${(cx + rad * Math.cos(ang)).toFixed(2)},${(cy + rad * Math.sin(ang)).toFixed(2)}`;
    const path = `M${p(a0, r)} A${r},${r} 0 ${large} 1 ${p(a1, r)} L${p(a1, ir)} A${ir},${ir} 0 ${large} 0 ${p(a0, ir)} Z`;
    a0 = a1;
    return { path, color: PIE_COLORS[i % PIE_COLORS.length], ...d };
  });
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <svg viewBox="0 0 220 220" width="200" height="200" style={{ flexShrink: 0 }}>
        {arcs.map((a, i) => <path key={i} d={a.path} fill={a.color} />)}
        <text x="110" y="106" textAnchor="middle" fontSize="13" fill="var(--c-text-sub)">총계</text>
        <text x="110" y="126" textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--c-navy-600)">{total.toLocaleString()}</text>
      </svg>
      <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 3, maxHeight: 220, overflowY: "auto" }}>
        {arcs.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: a.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: "var(--c-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.label}</span>
            <span style={{ fontWeight: 600, color: "var(--c-navy-600)" }}>{a.value.toLocaleString()}</span>
            <span style={{ color: "var(--c-text-sub)", width: 38, textAlign: "right" }}>{Math.round((a.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HBar({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <span style={{ width: 54, color: "var(--c-text-sub)", fontFamily: "ui-monospace, monospace", fontWeight: 600, flexShrink: 0 }}>{d.label}</span>
          <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, height: 16, overflow: "hidden" }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: "100%", background: "linear-gradient(90deg,var(--c-navy-600),var(--c-accent-500))" }} />
          </div>
          <span style={{ width: 64, textAlign: "right", fontWeight: 600, color: "var(--c-navy-600)" }}>{d.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

const STYLES = `
.op-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.op-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; flex: 1; max-width: 640px; }
.op-cards .kpi .delta { font-size: var(--app-fs-sm); font-weight: 600; margin-top: 4px; }
.op-period { border: 1px solid var(--c-border); border-radius: 6px; padding: 8px 10px; font-size: var(--app-fs-md); color: var(--c-text); height: fit-content; }
.op-card { background: #fff; border: 1px solid var(--c-border); border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; }
.op-h { font-size: var(--app-fs-md); font-weight: 700; color: var(--c-navy-600); margin-bottom: 12px; }
.op-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 900px) { .op-grid2 { grid-template-columns: 1fr; } .op-cards { grid-template-columns: 1fr; } }
.op-empty { padding: 40px 10px; text-align: center; color: var(--c-text-sub); font-size: var(--app-fs-sm); }
`;
