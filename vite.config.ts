import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // 사내 서버에서 mdm.sampyo.co.kr/v2/ path로 서빙 (Supabase OAuth가 IP 주소 redirect 거부 → hostname 사용)
  // 빅뱅 전환 시 '/'로 복원 + nginx location 정리
  base: "/v2/",
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
