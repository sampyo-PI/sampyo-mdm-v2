import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { rpc } from "../lib/supabase";

type QualityStats = {
  period_days: number;
  total_analyzed: number;
  avg_confidence_pct: number | null;
  avg_duplicate_severity: number | null;
  avg_attribute_fill_pct: number | null;
  reviewer_fix_rate_pct: number;
  final_approval_rate_pct: number;
  confidence_distribution: Array<{ label: string; count: number }>;
  low_confidence_requests: Array<{
    no: string;
    name: string;
    cat: string | null;
    conf: number;
    decision: string;
    created_at: string;
  }>;
  top_fixed_fields: Array<{ field: string; n: number; pct: number }>;
};

const BUCKET_COLORS: Record<string, string> = {
  "95~100%": "#16a34a",
  "85~95%": "#22c55e",
  "70~85%": "#84cc16",
  "50~70%": "#facc15",
  "30~50%": "#f59e0b",
  "<30%": "#dc2626",
};

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n}%`;
}
function fmtNum(n: number | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("ko-KR");
}

export function AIQualityPage() {
  const [days, setDays] = useState<number>(30);
  const { data } = useQuery({
    queryKey: ["ai-quality-stats", days],
    queryFn: () => rpc<QualityStats>("get_ai_quality_stats", { p_days: days }),
    staleTime: 60_000,
  });

  return (
    <section className="page-card">
      <div className="page-h">
        <div>
          <h1>AI 분류 정확도</h1>
        </div>
        <div className="actions">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: "var(--app-fs)" }}
          >
            <option value={30}>최근 30일</option>
            <option value={7}>최근 7일</option>
            <option value={90}>최근 90일</option>
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
        <div className="kpi">
          <div className="label">총 분석 건수</div>
          <div className="val">{fmtNum(data?.total_analyzed)}</div>
        </div>
        <div className="kpi accent">
          <div className="label">평균 분류 신뢰도</div>
          <div className="val">{fmtPct(data?.avg_confidence_pct)}</div>
        </div>
        <div className="kpi">
          <div className="label">평균 중복 가능성</div>
          <div className="val">{fmtPct(data?.avg_duplicate_severity)}</div>
        </div>
        <div className="kpi">
          <div className="label">검토자 수정률</div>
          <div className="val">{fmtPct(data?.reviewer_fix_rate_pct)}</div>
        </div>
        <div className="kpi">
          <div className="label">속성 추출률</div>
          <div className="val">{fmtPct(data?.avg_attribute_fill_pct)}</div>
        </div>
        <div className="kpi">
          <div className="label">최종 승인률</div>
          <div className="val">{fmtPct(data?.final_approval_rate_pct)}</div>
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 24 }}>신뢰도 분포 (분석 카드 기준)</div>
      <div className="page-card" style={{ marginBottom: 0, padding: 20 }}>
        <div style={{ display: "flex", gap: 4, alignItems: "stretch", height: 80 }}>
          {(data?.confidence_distribution ?? []).map((b, i) => (
            <div
              key={i}
              style={{
                flex: Math.max(b.count, 0.2),
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
              }}
            >
              <div
                style={{
                  background: BUCKET_COLORS[b.label] ?? "#999",
                  height: "100%",
                  borderRadius: 4,
                  position: "relative",
                  minHeight: 6,
                }}
              >
                {b.count > 0 && (
                  <span
                    className="text-xs"
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    {b.count}
                  </span>
                )}
              </div>
              <div className="text-xs" style={{ textAlign: "center", color: "var(--c-text-sub)", marginTop: 6 }}>
                {b.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 24 }}>
        ⚠ AI가 자신 없어한 신청 (신뢰도 50% 미만, 최근 20건)
      </div>
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
          {(data?.low_confidence_requests ?? []).length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--c-text-sub)", padding: 16 }}>해당 건 없음</td></tr>
          ) : (
            data!.low_confidence_requests.map((r) => (
              <tr key={r.no}>
                <td><a href={`#${r.no}`} style={{ color: "var(--c-accent-500)" }}>{r.no}</a></td>
                <td>{r.name}</td>
                <td className="text-xs">{r.cat ?? "—"}</td>
                <td><span className="text-xs font-bold" style={{ color: "#dc2626" }}>{r.conf}%</span></td>
                <td>
                  <span className={`badge ${r.decision === "APPROVED" ? "b-approve" : r.decision === "REJECTED" ? "b-error" : "b-warn"}`}>
                    {r.decision}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="section-title" style={{ marginTop: 24 }}>🔧 검토자가 자주 고치는 항목 (Top 8)</div>
      <table className="attr-table">
        <thead>
          <tr>
            <th>필드</th>
            <th style={{ width: 120 }}>수정 횟수</th>
            <th style={{ width: 120 }}>전체 대비</th>
          </tr>
        </thead>
        <tbody>
          {(data?.top_fixed_fields ?? []).length === 0 ? (
            <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--c-text-sub)", padding: 16 }}>해당 기간 검토자 수정 이력 없음</td></tr>
          ) : (
            data!.top_fixed_fields.map((r) => (
              <tr key={r.field}>
                <td className="mono text-xs">{r.field}</td>
                <td><strong>{r.n}</strong></td>
                <td><span className="text-xs" style={{ color: "var(--c-text-sub)" }}>{r.pct}%</span></td>
              </tr>
            ))
          )}
        </tbody>
      </table>

    </section>
  );
}
