import { useState } from "react";
import { ApprovalDrilldownTab } from "../components/dashboard/ApprovalDrilldownTab";
import { OperationsTab } from "../components/dashboard/OperationsTab";
import { CodeCleanupTab } from "../components/dashboard/CodeCleanupTab";

type Tab = "approval" | "operations" | "cleanup";

const TABS: { key: Tab; label: string; color: string; bg: string }[] = [
  { key: "approval", label: "검토·승인", color: "#2563eb", bg: "#eff6ff" },
  { key: "operations", label: "운영 모니터링", color: "#d97706", bg: "#fffbeb" },
  { key: "cleanup", label: "코드 정제", color: "#7c3aed", bg: "#f5f3ff" },
];

export function DashboardPage() {
  const [tab, setTab] = useState<Tab>("approval");

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{`
        .dash-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0 18px; }
        .dash-tab { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border-radius: 10px; border: 2px solid; font-size: 15px; font-weight: 700; cursor: pointer; transition: all .12s; }
      `}</style>

      <div className="page-h">
        <div>
          <h1>대시보드 <span className="text-xs text-gray-500 font-normal ml-2">/ dashboard</span></h1>
          <div className="meta">Sampyo MDM 통합 현황 — 검토·승인 / 운영 / 코드 정제</div>
        </div>
      </div>

      <div className="dash-tabs">
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              className="dash-tab"
              onClick={() => setTab(t.key)}
              style={on
                ? { background: t.color, color: "#fff", borderColor: t.color }
                : { background: t.bg, color: t.color, borderColor: t.color + "55" }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "approval" && <ApprovalDrilldownTab />}
      {tab === "operations" && <OperationsTab />}
      {tab === "cleanup" && <CodeCleanupTab />}
    </section>
  );
}
