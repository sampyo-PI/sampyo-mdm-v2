import type { Config } from "tailwindcss";

/**
 * SDS v0.1 토큰 매핑
 * - 색/사이즈는 sds.css의 CSS 변수가 진리. 여기서는 Tailwind 클래스에서 접근만 가능하게 매핑.
 * - SDS CLAUDE.md §2: 임의 색 추가 금지, 픽셀 직접 지정 금지.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        navy: {
          600: "var(--c-navy-600)",
          700: "var(--c-navy-700)",
          800: "var(--c-navy-800)",
        },
        accent: {
          500: "var(--c-accent-500)",
          600: "var(--c-accent-600)",
        },
        sidebar: "var(--c-sidebar-bg)",
        bg: "var(--c-bg)",
        text: "var(--c-text)",
        "text-sub": "var(--c-text-sub)",
        border: "var(--c-border)",
      },
      fontSize: {
        xs: "var(--app-fs-sm)",
        sm: "var(--app-fs)",
        base: "var(--app-fs-md)",
        lg: "var(--app-fs-lg)",
        xl: "var(--app-fs-h1)",
        "2xl": "var(--app-fs-h2)",
        "3xl": "var(--app-fs-xl)",
        kpi: "var(--app-fs-kpi)",
      },
      spacing: {
        sidebar: "var(--sidebar-w)",
        header: "var(--header-h)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
