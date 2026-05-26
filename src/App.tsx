import { BrowserRouter, useRoutes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "./components/layout/AppShell";
import { AuthProvider } from "./contexts/AuthContext";
import { routes, SIDEBAR_GROUPS } from "./routes";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

function AppRoutes() {
  return useRoutes(routes);
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppShell
            header={{
              brandCode: "MDM",
              systemName: "삼표품목코드시스템",
              subtitle: "v2 · SDS v0.1",
              gnb: [],
              // 검색바 미사용 (페이지별 필터로 충분)
              qaPath: "/qa",
              manualPath: "/manual",
            }}
            sidebar={{ groups: SIDEBAR_GROUPS }}
          >
            <AppRoutes />
          </AppShell>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
