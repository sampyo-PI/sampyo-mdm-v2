import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchDistributionRequests,
  approveDistribution,
  rejectDistribution,
  type DistRequestStatus,
} from "../lib/distributionRequests";

type Tab = DistRequestStatus | "all";
const TABS: { key: Tab; label: string }[] = [
  { key: "PENDING", label: "검토 대기" },
  { key: "APPROVED", label: "승인됨" },
  { key: "REJECTED", label: "반려됨" },
  { key: "all", label: "전체" },
];

const STATUS_BADGE: Record<DistRequestStatus, { cls: string; label: string }> = {
  PENDING: { cls: "b-warn", label: "검토 대기" },
  APPROVED: { cls: "b-approve", label: "승인" },
  REJECTED: { cls: "b-error", label: "반려" },
};

const fmt = (s: string) => new Date(s).toLocaleString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

export function DistributionRequestsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("PENDING");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["dist-requests", tab],
    queryFn: () => fetchDistributionRequests(tab),
    staleTime: 20_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["dist-requests"] });

  const approveMut = useMutation({
    mutationFn: (id: string) => approveDistribution(id),
    onSuccess: (res) => { if (res?.error) setMsg({ ok: false, text: res.error }); else { setMsg({ ok: true, text: "승인 완료 — 배포 처리됨" }); invalidate(); } },
    onError: (e) => setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }),
  });
  const rejectMut = useMutation({
    mutationFn: (v: { id: string; note: string }) => rejectDistribution(v.id, v.note),
    onSuccess: (res) => { if (res?.error) setMsg({ ok: false, text: res.error }); else { setMsg({ ok: true, text: "반려 처리됨" }); invalidate(); } },
    onError: (e) => setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }),
  });

  const pendingCount = rows.filter((r) => r.status === "PENDING").length;

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <div className="page-h">
        <div>
          <h1>배포 요청 관리 <span className="text-xs text-gray-500 font-normal ml-2">/ distribution-requests</span></h1>
          <div className="meta">사용자가 요청한 법인 배포를 승인/반려. 승인 시 해당 법인 ERP로 자동 전송{isLoading && " · 불러오는 중…"}</div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            {t.label}{t.key === "PENDING" && tab !== "PENDING" && pendingCount > 0 ? "" : ""}
          </button>
        ))}
      </div>

      {msg && (
        <div onClick={() => setMsg(null)} style={{ margin: "0 0 12px", padding: "8px 12px", borderRadius: 6, fontSize: 13, cursor: "pointer",
          background: msg.ok ? "#ecfdf5" : "#fef2f2", color: msg.ok ? "#047857" : "#b91c1c", border: `1px solid ${msg.ok ? "#bbf7d0" : "#fecaca"}` }}>
          {msg.text} (클릭하여 닫기)
        </div>
      )}

      <style>{`
        .dr-table { width: 100%; border-collapse: collapse; font-size: var(--app-fs-md); }
        .dr-table th { background: #f1f5f9; color: var(--c-navy-600); padding: 8px 10px; text-align: left; font-weight: 600; border-bottom: 1px solid var(--c-border); }
        .dr-table td { padding: 8px 10px; border-bottom: 1px solid #f1f3f6; color: var(--c-text); }
        .dr-table tr:hover td { background: #fafbfc; }
        .dr-code { font-family: ui-monospace, monospace; font-weight: 600; color: var(--c-navy-600); }
        .dr-act button { padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid; }
        .dr-approve { background: var(--c-navy-600); color: #fff; border-color: var(--c-navy-600); }
        .dr-reject { background: #fff; color: #dc2626; border-color: #fca5a5; margin-left: 6px; }
        .dr-empty { padding: 48px; text-align: center; color: #94a3b8; }
      `}</style>

      {isLoading ? (
        <div className="dr-empty">불러오는 중…</div>
      ) : rows.length === 0 ? (
        <div className="dr-empty">해당 상태의 배포 요청이 없습니다</div>
      ) : (
        <table className="dr-table">
          <thead>
            <tr>
              <th>요청일</th>
              <th>품목코드</th>
              <th>품목명</th>
              <th>요청 법인</th>
              <th>요청자</th>
              <th>사유</th>
              <th>상태</th>
              <th style={{ textAlign: "center" }}>처리</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const sb = STATUS_BADGE[r.status];
              return (
                <tr key={r.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmt(r.created_at)}</td>
                  <td className="dr-code">{r.item_code}</td>
                  <td>{r.item?.normalized_name || r.item?.item_name || "—"}</td>
                  <td>{r.company?.name || r.company_code}</td>
                  <td>{r.requesterName}{r.requesterDept ? ` · ${r.requesterDept}` : ""}</td>
                  <td style={{ color: "#64748b" }}>{r.requester_note || "—"}</td>
                  <td><span className={`badge ${sb.cls}`}>{sb.label}</span></td>
                  <td className="dr-act" style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                    {r.status === "PENDING" ? (
                      <>
                        <button className="dr-approve" disabled={approveMut.isPending}
                          onClick={() => { if (window.confirm(`${r.company?.name || r.company_code}에 배포 승인할까요? (ERP 전송)`)) approveMut.mutate(r.id); }}>승인</button>
                        <button className="dr-reject" disabled={rejectMut.isPending}
                          onClick={() => { const note = window.prompt("반려 사유 (선택)") ?? ""; rejectMut.mutate({ id: r.id, note }); }}>반려</button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">{r.reviewed_at ? fmt(r.reviewed_at) : "—"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
