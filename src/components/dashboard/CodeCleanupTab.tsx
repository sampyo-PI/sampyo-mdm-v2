const CATEGORIES = [
  { icon: "📦", label: "무재고 품목", desc: "전 법인 재고 보유 = 0" },
  { icon: "🛒", label: "장기 무발주 품목", desc: "최근 N년 발주 0건" },
  { icon: "🚫", label: "단종 품목", desc: "제조사 단종 통보" },
  { icon: "🗑", label: "불용자재", desc: "사용 중단 결정" },
];

export function CodeCleanupTab() {
  return (
    <div style={{ padding: "40px 20px" }}>
      <style>{`
        .cc-wrap { max-width: 760px; margin: 0 auto; text-align: center; }
        .cc-ic { width: 64px; height: 64px; border-radius: 999px; background: #fef3c7; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; font-size: 30px; }
        .cc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; text-align: left; margin: 22px 0; }
        .cc-card { padding: 14px 16px; border: 1px solid var(--c-border); border-radius: 8px; background: #f8fafc; }
        .cc-card .t { font-size: var(--app-fs-md); font-weight: 600; color: var(--c-text); }
        .cc-card .d { font-size: var(--app-fs-sm); color: var(--c-text-sub); margin-top: 3px; }
        .cc-badge { display: inline-block; padding: 3px 12px; border-radius: 999px; border: 1px solid var(--c-border); color: var(--c-text-sub); font-size: var(--app-fs-sm); font-weight: 600; }
      `}</style>
      <div className="cc-wrap">
        <div className="cc-ic">🚧</div>
        <h3 style={{ fontSize: "var(--app-fs-lg)", fontWeight: 700, color: "var(--c-navy-600)" }}>연간 코드 정제 (준비 중)</h3>
        <p style={{ color: "var(--c-text-sub)", fontSize: "var(--app-fs-md)", marginTop: 8 }}>
          재고·발주·단종·불용 상태를 기준으로 정제 후보 품목을 추출하여 검토·일괄 REVOKE 워크플로우를 제공합니다.
        </p>
        <div className="cc-grid">
          {CATEGORIES.map((c) => (
            <div key={c.label} className="cc-card">
              <div className="t">{c.icon} {c.label}</div>
              <div className="d">{c.desc}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "var(--app-fs-sm)", color: "var(--c-text-sub)", marginBottom: 12 }}>
          재고공유 시스템과 ERP 발주 이력 동기화 완료 후 활성화됩니다.
        </p>
        <span className="cc-badge">Phase 2 예정</span>
      </div>
    </div>
  );
}
