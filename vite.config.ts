import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // 빅뱅 전환 완료 (2026-06-09): root(/) 서빙. nginx root를 v2 dist로 교체.
  // (이전: mdm.sampyo.co.kr/v2/ path 서빙 — Supabase OAuth IP redirect 거부 회피용)
  // 롤백 시 base를 "/v2/"로 되돌리고 /v2/ 빌드 재배포.
  base: "/",
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        // 청크 분리: 큰 라이브러리는 별도 청크로 → 초기 로드 가벼움 + 라이브러리 변경 시에만 invalidate
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (id.includes("ag-grid-community") || id.includes("ag-grid-react")) return "ag-grid";
            if (id.includes("@supabase/")) return "supabase";
            if (id.includes("@tanstack/")) return "tanstack";
            if (id.includes("react-router") || id.includes("/react-dom/") || id.includes("/react/")) {
              return "react-vendor";
            }
          }
          return undefined;
        },
      },
    },
  },
});
