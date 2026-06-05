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
          <h1>대시보드 <span className="text-xs text-gray-500 font-normal ml-2">/ dashboard</span></h1>
          <div className="meta">Sampyo MDM 통합 현황 — 검토·승인 / 운영 / 코드 정제</div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === "approval" && <ApprovalDrilldownTab />}
      {tab === "operations" && <OperationsTab />}
      {tab === "cleanup" && <CodeCleanupTab />}
    </section>
  );
}
