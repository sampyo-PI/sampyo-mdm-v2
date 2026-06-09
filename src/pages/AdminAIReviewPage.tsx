import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { rpc } from "../lib/supabase";

type AdminReviewStats = {
  period_days: number;
  total_reviews: number;
  auto_approved: number;
  auto_rejected: number;
  escalated: number;
  avg_duration_ms: number;
  check_pass_rates: Array<{ code: string; pct: number; pass_cnt: number; total: number }>;
  recent_decisions: Array<{
    no: string;
    name: string;
    co: string | null;
    dec: string;
    reasons: string[] | null;
    ms: number;
    created_at: string;
  }>;
  stale_escalations: Array<{
    no: string;
    name: string;
    requester: string | null;
    dept: string | null;
    days_passed: number;
    escalated_at: string;
  }>;
};

const CHECK_LABELS: Record<string, { label: string; desc: string }> = {
  C1: { label: "분류 정합성", desc: "AI 추정 vs 신청 소분류 일치" },
  C2: { label: "중복 위험", desc: "유사 기존 품목 매칭 severity" },
  C3: { label: "속성 채움률", desc: "풀 크기 적응 (min(2, total))" },
  C4: { label: "표준명 유효성", desc: "compute_normalized_name 일치" },
  C5: { label: "제조사 등록", desc: "makers 마스터 매칭" },
  C6: { label: "최종 권고", desc: "C1~C5 종합 결정" },
  C7: { label: "AI 응답 신뢰도", desc: "Gemini confidence ≥ 임계" },
  C8: { label: "워크플로우 진입", desc: "status 전환 + 큐 등록" },
};

const PERIODS = [
  { value: 7, label: "최근 7일" },
  { value: 30, label: "최근 30일" },
  { value: 90, label: "최근 90일" },
];

function fmt(n: number | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("ko-KR");
}
function pct(part: number, total: number): string {
  if (total === 0) return "—";
  return `${Math.round((part / total) * 1000) / 10}%`;
}
function fmtRelTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((now.getTime() - d.getTime()) / dayMs);
  if (diffDays === 0) return `오늘 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (diffDays === 1) return `어제 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function AdminAIReviewPage() {
  const [days, setDays] = useState<number>(7);
  const { data } = useQuery({
    queryKey: ["ai-admin-review", days],
    queryFn: () => rpc<AdminReviewStats>("get_ai_admin_review_stats", { p_days: days }),
    staleTime: 60_000,
  });

  return (
    <section className="page-card">
      <div className="page-h">
        <div>
          <h1>AI 1차 검토 통계</h1>
        </div>
        <div className="actions">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: "var(--app-fs)" }}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 3일 초과 보완 요청 미응답 알림 */}
      {data && data.stale_escalations.length > 0 && (
        <div className="callout warn" style={{ marginBottom: 16 }}>
          <div className="ct-title">⚠ 3일 초과 보완 요청 — 신청자 미응답 {data.stale_escalations.length}건</div>
          <ul style={{ margin: "8px 0 0 0", paddingLeft: 20, fontSize: "var(--app-fs-sm)" }}>
            {data.stale_escalations.map((s) => (
              <li key={s.no}>
                {s.no} — {s.requester ?? "—"} ({s.dept ?? "—"}) · {s.days_passed}일 경과
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <div className="kpi">
          <div className="label">총 AI 검토</div>
          <div className="val">{fmt(data?.total_reviews)}</div>
          <div className="delta" style={{ color: "var(--c-text-sub)" }}>최근 {days}일</div>
        </div>
        <div className="kpi accent">
          <div className="label">자동 승인 (PR2)</div>
          <div className="val">{fmt(data?.auto_approved)}</div>
          <div className="delta" style={{ color: "#16a34a" }}>
            {data ? pct(data.auto_approved, data.total_reviews) : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="label">자동 반려</div>
          <div className="val">{fmt(data?.auto_rejected)}</div>
          <div className="delta" style={{ color: "#dc2626" }}>
            {data ? pct(data.auto_rejected, data.total_reviews) : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="label">ESCALATE</div>
          <div className="val">{fmt(data?.escalated)}</div>
          <div className="delta" style={{ color: "#d97706" }}>
            {data ? pct(data.escalated, data.total_reviews) : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="label">평균 처리시간</div>
          <div className="val">
            {data ? (data.avg_duration_ms / 1000).toFixed(1) : "—"}
            <span className="text-xs font-normal ml-1">s</span>
          </div>
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 24 }}>C1~C8 체크리스트 — 통과율</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {(data?.check_pass_rates ?? []).map((c) => {
          const meta = CHECK_LABELS[c.code] ?? { label: "—", desc: "" };
          return (
            <div key={c.code} className="page-card" style={{ marginBottom: 0, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="badge b-approve" style={{ fontSize: "var(--app-fs-sm)", fontWeight: 700 }}>{c.code}</span>
                <span style={{ fontWeight: 600 }}>{meta.label}</span>
                <span style={{ flex: 1 }}></span>
                <span
                  className="text-xs"
                  style={{ fontWeight: 700, color: c.pct >= 90 ? "#16a34a" : c.pct >= 80 ? "#d97706" : "#dc2626" }}
                >
                  {c.pct}%
                </span>
              </div>
              <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${c.pct}%`,
                    height: "100%",
                    background: c.pct >= 90 ? "#16a34a" : c.pct >= 80 ? "#f59e0b" : "#dc2626",
                  }}
                ></div>
              </div>
              <div className="text-xs" style={{ color: "var(--c-text-sub)", marginTop: 8 }}>
                {meta.desc} ({c.pass_cnt}/{c.total})
              </div>
            </div>
          );
        })}
      </div>

      <div className="section-title" style={{ marginTop: 24 }}>최근 AI 결정 로그 (최대 20건)</div>
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
          {(data?.recent_decisions ?? []).length === 0 ? (
            <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--c-text-sub)", padding: 16 }}>해당 기간 결정 이력 없음</td></tr>
          ) : (
            data!.recent_decisions.map((r, i) => (
              <tr key={`${r.no}-${i}`}>
                <td><a href={`#${r.no}`} style={{ color: "var(--c-accent-500)" }} className="mono text-xs">{r.no}</a></td>
                <td>{r.name}</td>
                <td className="text-xs mono">{r.co ?? "—"}</td>
                <td>
                  <span className={`badge ${r.dec === "APPROVED" ? "b-approve" : r.dec === "REJECTED" ? "b-error" : "b-warn"}`}>
                    {r.dec}
                  </span>
                </td>
                <td className="text-xs">{r.reasons && r.reasons.length > 0 ? r.reasons.join(", ") : "—"}</td>
                <td className="text-xs">{r.ms}ms</td>
                <td className="text-xs" style={{ color: "var(--c-text-sub)" }}>{fmtRelTime(r.created_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="text-xs" style={{ color: "var(--c-text-sub)", marginTop: 16 }}>
        ⓘ 더 자세한 통계는 <a href={`${import.meta.env.BASE_URL}ai/quality`} style={{ color: "var(--c-accent-500)" }}>AI 분류 정확도</a>에서 확인하세요.
      </div>

    </section>
  );
}
