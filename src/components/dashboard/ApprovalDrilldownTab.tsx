import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { rpc } from "../../lib/supabase";

type GroupBy = "division" | "department" | "site";
const GROUP_LABEL: Record<GroupBy, { tab: string; full: string; unset: string }> = {
  division: { tab: "부문", full: "부문별", unset: "(부문 미지정)" },
  department: { tab: "부서", full: "부서별", unset: "(부서 미지정)" },
  site: { tab: "사업장", full: "사업장별", unset: "(사업장 미지정)" },
};

type DrilldownRow = {
  status: string;
  company_id: string | null;
  company_code: string | null;
  company_name: string | null;
  group_id: string | null;
  group_label: string | null;
  cnt: number;
};

const STATUS_BUCKETS = [
  { key: "REQUESTER_FIX", label: "신청자 보완요청", statuses: ["AI_ESCALATED_TO_REQUESTER"], color: "#ea580c", bg: "#ffedd5" },
  { key: "REVIEW_1", label: "1차 검토대기", statuses: ["PENDING_REVIEW_1", "MANUAL_REVIEW_AFTER_AI"], color: "#d97706", bg: "#fef3c7" },
  { key: "REVIEW_2", label: "2차 검토대기", statuses: ["PENDING_REVIEW_2"], color: "#0ea5e9", bg: "#e0f2fe" },
  { key: "REVIEW_3", label: "3차 검토대기", statuses: ["PENDING_REVIEW_3"], color: "#0ea5e9", bg: "#e0f2fe" },
  { key: "APPROVED", label: "최근 승인 (30일)", statuses: ["APPROVED"], color: "#16a34a", bg: "#dcfce7" },
  { key: "REJECTED", label: "최근 반려 (30일)", statuses: ["REJECTED"], color: "#dc2626", bg: "#fee2e2" },
];

export function ApprovalDrilldownTab() {
  const [selectedBucket, setSelectedBucket] = useState("REVIEW_1");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("division");

  const sinceISO = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const { data: allStats = [], isLoading } = useQuery({
    queryKey: ["dash-drilldown", groupBy, sinceISO],
    queryFn: async () => {
      const [pending, recent] = await Promise.all([
        rpc<DrilldownRow[]>("get_request_drilldown_v2", {
          p_statuses: ["AI_ESCALATED_TO_REQUESTER", "PENDING_REVIEW_1", "MANUAL_REVIEW_AFTER_AI", "PENDING_REVIEW_2", "PENDING_REVIEW_3"],
          p_since: null, p_group_by: groupBy,
        }),
        rpc<DrilldownRow[]>("get_request_drilldown_v2", {
          p_statuses: ["APPROVED", "REJECTED"], p_since: sinceISO, p_group_by: groupBy,
        }),
      ]);
      return [...(pending || []), ...(recent || [])];
    },
    staleTime: 60_000,
  });

  const bucketTotals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const b of STATUS_BUCKETS) t[b.key] = allStats.filter((r) => b.statuses.includes(r.status)).reduce((s, r) => s + Number(r.cnt), 0);
    return t;
  }, [allStats]);

  const byCompany = useMemo(() => {
    const bucket = STATUS_BUCKETS.find((b) => b.key === selectedBucket);
    const rows = allStats.filter((r) => bucket?.statuses.includes(r.status));
    const m: Record<string, { code: string; name: string; total: number; groups: { id: string | null; name: string; cnt: number }[] }> = {};
    for (const r of rows) {
      const cid = r.company_id || "unknown";
      if (!m[cid]) m[cid] = { code: r.company_code || "(미지정)", name: r.company_name || "(미지정)", total: 0, groups: [] };
      m[cid].total += Number(r.cnt);
      m[cid].groups.push({ id: r.group_id, name: r.group_label || GROUP_LABEL[groupBy].unset, cnt: Number(r.cnt) });
    }
    return m;
  }, [allStats, selectedBucket, groupBy]);

  const companies = useMemo(() => Object.entries(byCompany).sort((a, b) => b[1].total - a[1].total), [byCompany]);
  const selectedCompanyData = selectedCompany ? byCompany[selectedCompany] : null;
  const curBucket = STATUS_BUCKETS.find((b) => b.key === selectedBucket);

  return (
    <div>
      <style>{STYLES}</style>
      <div className="dd-buckets">
        {STATUS_BUCKETS.map((b) => (
          <button key={b.key} className={`dd-bucket${selectedBucket === b.key ? " sel" : ""}`} onClick={() => { setSelectedBucket(b.key); setSelectedCompany(null); }}>
            <span className="num" style={{ color: b.color }}>{isLoading ? "…" : bucketTotals[b.key] ?? 0}</span>
            <span className="lbl">{b.label}</span>
            <span className="dot" style={{ background: b.color }} />
          </button>
        ))}
      </div>

      <div className="dd-grid">
        <div className="dd-card">
          <div className="dd-h">법인별 {curBucket?.label} <span className="t-meta">({companies.length}개 법인)</span></div>
          <div className="dd-list">
            {isLoading ? <div className="dd-empty">불러오는 중…</div>
              : companies.length === 0 ? <div className="dd-empty">건수 없음</div>
              : companies.map(([cid, c]) => (
                <button key={cid} className={`dd-row${selectedCompany === cid ? " sel" : ""}`} onClick={() => setSelectedCompany(cid)}>
                  <span><span className="dd-code">{c.code}</span> {c.name}</span>
                  <span className="dd-cnt">{c.total} ›</span>
                </button>
              ))}
          </div>
        </div>

        <div className="dd-card">
          <div className="dd-h" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span>{selectedCompanyData ? `${selectedCompanyData.name} ${GROUP_LABEL[groupBy].full} 분포` : "법인을 선택하세요"}</span>
            <span className="dd-toggle">
              {(["division", "department", "site"] as GroupBy[]).map((gb) => (
                <button key={gb} className={groupBy === gb ? "on" : ""} onClick={() => setGroupBy(gb)}>{GROUP_LABEL[gb].tab}</button>
              ))}
            </span>
          </div>
          {!selectedCompanyData ? (
            <div className="dd-empty">왼쪽 법인을 클릭하면 {GROUP_LABEL[groupBy].full} 분포가 표시됩니다</div>
          ) : (
            <div className="dd-list">
              {[...selectedCompanyData.groups].sort((a, b) => b.cnt - a.cnt).map((g, i) => (
                <div key={`${g.id}-${i}`} className="dd-row static"><span>{g.name}</span><span className="dd-cnt">{g.cnt}</span></div>
              ))}
              <div style={{ textAlign: "right", paddingTop: 10 }}>
                <Link to={`/requests?company=${selectedCompanyData.code}&status=${curBucket?.statuses.join(",")}`} className="btn-sec" style={{ fontSize: 13 }}>신청 목록으로 ›</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const STYLES = `
.dd-buckets { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 16px; }
.dd-bucket { position: relative; background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px 12px; cursor: pointer; text-align: left; transition: all .12s; }
.dd-bucket:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
.dd-bucket.sel { border-color: #003876; box-shadow: 0 0 0 2px rgba(0,56,118,0.15); }
.dd-bucket .num { display: block; font-size: 24px; font-weight: 700; line-height: 1.1; }
.dd-bucket .lbl { display: block; font-size: 12px; color: #64748b; margin-top: 4px; }
.dd-bucket .dot { position: absolute; top: 12px; right: 12px; width: 8px; height: 8px; border-radius: 999px; }
@media (max-width: 1100px) { .dd-buckets { grid-template-columns: repeat(3, 1fr); } }
.dd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 900px) { .dd-grid { grid-template-columns: 1fr; } }
.dd-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px 16px; }
.dd-h { font-size: 14px; font-weight: 700; color: #003876; margin-bottom: 10px; }
.dd-list { max-height: 380px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
.dd-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: 6px; font-size: 14px; color: #1f2937; background: none; border: none; cursor: pointer; text-align: left; width: 100%; }
.dd-row:hover { background: #f8fafc; }
.dd-row.sel { background: #eff6ff; box-shadow: inset 0 0 0 1px #bfdbfe; }
.dd-row.static { cursor: default; }
.dd-row.static:hover { background: #f8fafc; }
.dd-code { font-family: ui-monospace, monospace; font-size: 11px; font-weight: 700; color: #003876; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 6px; }
.dd-cnt { font-weight: 700; color: #003876; }
.dd-empty { padding: 32px 10px; text-align: center; color: #94a3b8; font-size: 13px; }
.dd-toggle { display: inline-flex; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
.dd-toggle button { padding: 4px 10px; font-size: 12px; border: none; background: #fff; color: #64748b; cursor: pointer; }
.dd-toggle button.on { background: #003876; color: #fff; }
.t-meta { font-size: 12px; color: #64748b; font-weight: 500; }
`;
