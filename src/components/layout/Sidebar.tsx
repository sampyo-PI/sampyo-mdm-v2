import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

export type SidebarIconKey =
  | "request" | "master" | "tree" | "tag" | "factory" | "ai" | "settings" | "chat";

export type SidebarChild = {
  label: string;
  path: string;
  adminOnly?: boolean;
};

export type SidebarItem = {
  label: string;
  icon?: SidebarIconKey;
  path?: string;             // 직접 링크 (children 없을 때)
  children?: SidebarChild[]; // 확장형 그룹
  adminOnly?: boolean;
  highlight?: boolean;
};

// Lucide line icons — 단순한 1.8 stroke (1.5em 크기에 맞춰 보정)
const ICONS: Record<SidebarIconKey, React.ReactNode> = {
  request: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>,
  master:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>,
  tree:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  tag:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41 12 22l-9-9V3h10z"/><circle cx="7.5" cy="7.5" r="1.2"/></svg>,
  factory: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V9l6 4V9l6 4V5h6v16z"/><line x1="3" y1="21" x2="21" y2="21"/></svg>,
  ai:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="6" width="16" height="13" rx="2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><line x1="12" y1="3" x2="12" y2="6"/></svg>,
  settings:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  chat:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
};

export type SidebarProps = {
  items: SidebarItem[];
  isAdmin?: boolean;
};

/** 현재 경로가 속한 그룹 라벨 추출 */
function activeGroupsFor(items: SidebarItem[], pathname: string): string[] {
  return items
    .filter((it) => it.children?.some((c) => c.path === pathname))
    .map((it) => it.label);
}

export function Sidebar({ items, isAdmin = false }: SidebarProps) {
  const location = useLocation();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(activeGroupsFor(items, location.pathname)));

  // 경로 변경 시 해당 그룹 자동 확장
  useEffect(() => {
    const active = activeGroupsFor(items, location.pathname);
    if (active.length === 0) return;
    setExpanded((prev) => {
      let changed = false;
      const next = new Set(prev);
      active.forEach((g) => {
        if (!next.has(g)) {
          next.add(g);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [location.pathname, items]);

  const toggle = (label: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  // adminOnly 필터
  const visibleItems = items.filter((it) => !it.adminOnly || isAdmin);

  return (
    <aside className="side" id="side">
      {visibleItems.map((item) => {
        // 직접 링크 (children 없음)
        if (!item.children || item.children.length === 0) {
          return (
            <NavLink
              key={item.label}
              to={item.path ?? "#"}
              end={item.path === "/"}
              className={({ isActive }) =>
                [
                  "sb-leaf",
                  isActive ? "active" : "",
                  item.highlight ? "highlight" : "",
                ].filter(Boolean).join(" ")
              }
            >
              {item.icon && <span className="sb-ic">{ICONS[item.icon]}</span>}
              <span>{item.label}</span>
            </NavLink>
          );
        }

        // 확장형 그룹
        const isOpen = expanded.has(item.label);
        const visibleChildren = item.children.filter((c) => !c.adminOnly || isAdmin);
        if (visibleChildren.length === 0) return null;

        return (
          <div key={item.label} className="sb-group">
            <button
              type="button"
              className={`sb-group-h${isOpen ? " open" : ""}`}
              onClick={() => toggle(item.label)}
            >
              {item.icon && <span className="sb-ic">{ICONS[item.icon]}</span>}
              <span className="sb-group-label">{item.label}</span>
              <span className="sb-chev">{isOpen ? "▾" : "▸"}</span>
            </button>
            {isOpen && (
              <div className="sb-children">
                {visibleChildren.map((c) => (
                  <NavLink
                    key={c.path}
                    to={c.path}
                    className={({ isActive }) => `sb-child${isActive ? " active" : ""}`}
                  >
                    {c.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
