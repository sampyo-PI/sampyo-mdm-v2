import { type ReactNode } from "react";
import { BrowserRouter, useRoutes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "./components/layout/AppShell";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { routes, SIDEBAR_ITEMS } from "./routes";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

function AppRoutes() {
  return useRoutes(routes);
}

/** 인증 게이트 — 세션 없으면 앱(사이드바/페이지) 미노출, 로그인 화면만.
 *  (v1 ProtectedRoute 동등. 비로그인 사용자가 앱·데이터에 접근하는 보안 갭 차단) */
function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 14 }}>
        세션 확인 중…
      </div>
    );
  }
  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#f1f5f9" }}>
        <div style={{ width: "100%", maxWidth: 920 }}>
          <LoginPage />
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthGate>
            <AppShell
              header={{
                brandCode: "MDM",
                systemName: "삼표품목코드시스템",
                subtitle: "v2 · SDS v0.1",
                gnb: [],
                // 검색바 미사용 (페이지별 필터로 충분)
                qaPath: "/qna",
                manualPath: "/manual",
              }}
              sidebar={{ items: SIDEBAR_ITEMS }}
            >
              <AppRoutes />
            </AppShell>
          </AuthGate>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
