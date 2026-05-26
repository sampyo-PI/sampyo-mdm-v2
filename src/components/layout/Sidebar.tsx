import { NavLink } from "react-router-dom";

export type SidebarLink = { label: string; path: string };
export type SidebarGroup = { title: string; links: SidebarLink[] };

export type SidebarProps = {
  groups: SidebarGroup[];
};

export function Sidebar({ groups }: SidebarProps) {
  return (
    <aside className="side" id="side">
      {groups.map((g, gi) => (
        <div key={gi}>
          <div className="group-title">{g.title}</div>
          {g.links.map((l, li) => (
            <NavLink
              key={`${l.path}-${li}`}
              to={l.path}
              end={l.path === "/"}
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      ))}
    </aside>
  );
}
