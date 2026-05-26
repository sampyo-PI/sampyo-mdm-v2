import { type RouteObject } from "react-router-dom";
import { lazy, Suspense } from "react";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { ConnectionTestPage } from "./pages/ConnectionTestPage";
import { LoginPage } from "./pages/LoginPage";

// AG-Grid가 들어간 페이지들은 별도 청크로 → 첫 페이지가 비-그리드일 때 1.1MB 절약
const ListPage = lazy(() => import("./pages/ListPage").then((m) => ({ default: m.ListPage })));
const CatalogPage = lazy(() => import("./pages/CatalogPage").then((m) => ({ default: m.CatalogPage })));

function PageLoader() {
  return <div className="p-6 text-text-sub">로딩 중…</div>;
}

function withSuspense(node: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{node}</Suspense>;
}

export const routes: RouteObject[] = [
  { path: "/", element: withSuspense(<CatalogPage />) },
  { path: "/request", element: <PlaceholderPage title="품목등록" path="/request" /> },
  { path: "/requests", element: <PlaceholderPage title="요청목록" path="/requests" /> },
  { path: "/categories", element: <PlaceholderPage title="분류 관리" path="/categories" /> },
  { path: "/admin/reviewers", element: <PlaceholderPage title="검토자 관리" path="/admin/reviewers" /> },
  { path: "/admin/ai-review", element: <PlaceholderPage title="AI 검토 현황" path="/admin/ai-review" /> },
  { path: "/admin/erp", element: <PlaceholderPage title="ERP 매핑" path="/admin/erp" /> },
  { path: "/qa", element: <PlaceholderPage title="Q&A 게시판" path="/qa" /> },
  { path: "/manual", element: <PlaceholderPage title="사용자 매뉴얼" path="/manual" /> },
  { path: "/login", element: <LoginPage /> },
  // 개발 전용 — 메뉴에서 숨김
  { path: "/list-demo", element: withSuspense(<ListPage />) },
  { path: "/connection-test", element: <ConnectionTestPage /> },
];

export const SIDEBAR_GROUPS = [
  {
    title: "품목마스터",
    links: [
      { label: "카탈로그", path: "/" },
      { label: "품목등록", path: "/request" },
      { label: "요청목록", path: "/requests" },
      { label: "분류 관리", path: "/categories" },
    ],
  },
  {
    title: "관리자",
    links: [
      { label: "검토자 관리", path: "/admin/reviewers" },
      { label: "AI 검토 현황", path: "/admin/ai-review" },
      { label: "ERP 매핑", path: "/admin/erp" },
    ],
  },
  {
    title: "도움말",
    links: [
      { label: "Q&A 게시판", path: "/qa" },
      { label: "매뉴얼", path: "/manual" },
    ],
  },
  // 개발용 페이지는 메뉴에서 숨김 (라우트는 유지)
];

export const GNB_ITEMS = [
  { label: "홈", path: "/" },
  { label: "품목", path: "/detail" },
  { label: "Q&A", path: "/qa" },
  { label: "매뉴얼", path: "/manual" },
];
