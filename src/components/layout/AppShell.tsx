import { useCallback } from "react";
import { Header, type HeaderProps } from "./Header";
import { Sidebar, type SidebarProps } from "./Sidebar";

type AppShellProps = {
  header: Omit<HeaderProps, "onToggleSidebar">;
  sidebar: SidebarProps;
  children: React.ReactNode;
};

export function AppShell({ header, sidebar, children }: AppShellProps) {
  const handleToggle = useCallback(() => {
    const cur = document.documentElement.dataset.side ?? "expanded";
    document.documentElement.dataset.side = cur === "collapsed" ? "expanded" : "collapsed";
  }, []);

  return (
    <>
      <Header {...header} onToggleSidebar={handleToggle} />
      <div className="flex min-h-screen">
        <Sidebar {...sidebar} />
        <main className="flex-1 p-6 min-w-0">{children}</main>
      </div>
    </>
  );
}
