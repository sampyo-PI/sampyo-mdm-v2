import { useState } from "react";
import { ApprovalDrilldownTab } from "../components/dashboard/ApprovalDrilldownTab";
import { OperationsTab } from "../components/dashboard/OperationsTab";
import { CodeCleanupTab } from "../components/dashboard/CodeCleanupTab";

type Tab = "approval" | "operations" | "cleanup";

const TABS: { key: Tab; label: string }[] = [
  { key: "approval", label: "검토·승인" },
  { key: "operations", label: "운영 모니터링" },
  { key: "cleanup", label: "코드 정제" },
];

export function DashboardPage() {
  const [tab, setTab] = useState<Tab>("approval");

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <div className="page-h">
        <div>
          <h1>대시보드</h1>
        </div>
      </div>

      <div className="dash-seg">
        {TABS.map((t) => (
          <button key={t.key} className={`dash-seg-btn${tab === t.key ? " on" : ""}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>
      <style>{`
        .dash-seg { display: inline-flex; gap: 6px; background: #f1f5f9; padding: 5px; border-radius: 10px; margin: 16px 0 18px; }
        .dash-seg-btn { padding: 9px 22px; border: none; background: transparent; color: var(--c-text-sub); font-size: var(--app-fs-md); font-weight: 600; border-radius: 7px; cursor: pointer; transition: all .12s; }
        .dash-seg-btn:hover { color: var(--c-navy-600); }
        .dash-seg-btn.on { background: var(--c-navy-600); color: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.18); }
      `}</style>

      {tab === "approval" && <ApprovalDrilldownTab />}
      {tab === "operations" && <OperationsTab />}
      {tab === "cleanup" && <CodeCleanupTab />}
    </section>
  );
}
