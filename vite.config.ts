import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
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
