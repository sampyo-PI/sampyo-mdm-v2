export type SidebarLink = { label: string; href: string; active?: boolean };
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
            <a key={`${l.href}-${li}`} href={l.href} className={l.active ? "active" : undefined}>
              {l.label}
            </a>
          ))}
        </div>
      ))}
    </aside>
  );
}
