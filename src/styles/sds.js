/* ═══════════════════════════════════════════════════════════
   Sampyo Design System — 공통 스크립트 v0.1
   ═══════════════════════════════════════════════════════════ */

// AG-Grid 폰트 토글 시 row/header height
const SDS_FS_ROW = {
  sm: { row: 30, header: 26 },
  md: { row: 34, header: 30 },
  lg: { row: 42, header: 34 },
  xl: { row: 52, header: 40 },
};

// AG-Grid API 등록부 (다중 그리드 지원)
window.sdsGridApis = window.sdsGridApis || [];
window.sdsRegisterGrid = function(api) {
  window.sdsGridApis.push(api);
};

// ─── 사이드바 토글 ───
function sdsInitSideToggle() {
  const btn = document.getElementById("btn-side");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-side") || "expanded";
    document.documentElement.setAttribute("data-side", cur === "collapsed" ? "expanded" : "collapsed");
    setTimeout(() => window.sdsGridApis.forEach(api => api.sizeColumnsToFit?.()), 280);
  });
}

// ─── 폰트 토글 ───
function sdsInitFsToggle() {
  const root = document.getElementById("fs-toggle");
  if (!root) return;
  root.addEventListener("click", e => {
    const btn = e.target.closest("button[data-fs]");
    if (!btn) return;
    root.querySelectorAll("button").forEach(b => b.classList.remove("on"));
    btn.classList.add("on");
    const fs = btn.dataset.fs;
    document.documentElement.setAttribute("data-fs", fs);
    const { row, header } = SDS_FS_ROW[fs] || SDS_FS_ROW.md;
    window.sdsGridApis.forEach(api => {
      try { api.setGridOption("rowHeight", row); api.setGridOption("headerHeight", header); api.resetRowHeights(); } catch(_) {}
    });
  });
}

// ─── 모달 컨트롤 ───
window.sdsOpenModal = function(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add("open");
  // ESC 닫기
  const onKey = e => { if (e.key === "Escape") { window.sdsCloseModal(id); document.removeEventListener("keydown", onKey); } };
  document.addEventListener("keydown", onKey);
};
window.sdsCloseModal = function(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove("open");
};

// ─── 모달 backdrop 클릭 닫기 ───
function sdsInitModals() {
  document.querySelectorAll(".modal-backdrop").forEach(bd => {
    bd.addEventListener("click", e => { if (e.target === bd) bd.classList.remove("open"); });
  });
}

// ─── 탭 컨트롤 ───
function sdsInitTabs() {
  document.querySelectorAll("[data-tabs]").forEach(group => {
    const buttons = group.querySelectorAll("button[data-tab]");
    const panels = document.querySelectorAll("[data-tab-panel]");
    buttons.forEach(b => b.addEventListener("click", () => {
      buttons.forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      const k = b.dataset.tab;
      panels.forEach(p => p.style.display = (p.dataset.tabPanel === k ? "" : "none"));
    }));
  });
}

// ─── DOM 준비 시 일괄 초기화 ───
document.addEventListener("DOMContentLoaded", () => {
  sdsInitSideToggle();
  sdsInitFsToggle();
  sdsInitModals();
  sdsInitTabs();
});
