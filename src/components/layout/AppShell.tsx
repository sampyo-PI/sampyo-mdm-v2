import { useCallback } from "react";
import { Header, type HeaderProps } from "./Header";
import { Sidebar, type SidebarProps } from "./Sidebar";
import { useAuth } from "../../contexts/AuthContext";

type AppShellProps = {
  header: Omit<HeaderProps, "onToggleSidebar">;
  sidebar: Omit<SidebarProps, "isAdmin">;
  children: React.ReactNode;
};

export function AppShell({ header, sidebar, children }: AppShellProps) {
  const { isAdmin } = useAuth();
  const handleToggle = useCallback(() => {
    const cur = document.documentElement.dataset.side ?? "expanded";
    document.documentElement.dataset.side = cur === "collapsed" ? "expanded" : "collapsed";
  }, []);

  return (
    <>
      <Header {...header} onToggleSidebar={handleToggle} />
      <div className="flex min-h-screen">
        <Sidebar {...sidebar} isAdmin={isAdmin} />
        <main className="flex-1 p-6 min-w-0">{children}</main>
      </div>
    </>
  );
}
