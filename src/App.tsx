import { BrowserRouter, useRoutes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "./components/layout/AppShell";
import { AuthProvider } from "./contexts/AuthContext";
import { routes, SIDEBAR_GROUPS, GNB_ITEMS } from "./routes";

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
              systemName: "품목마스터DM",
              subtitle: "v2 · SDS v0.1",
              gnb: GNB_ITEMS,
              searchPlaceholder: "품목코드 / 품명",
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
