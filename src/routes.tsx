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
  { path: "/list-demo", element: withSuspense(<ListPage />) },
  { path: "/connection-test", element: <ConnectionTestPage /> },
  { path: "/detail", element: <PlaceholderPage title="품목 상세" path="/detail" /> },
  { path: "/edit", element: <PlaceholderPage title="품목 수정·등록" path="/edit" /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/modals", element: <PlaceholderPage title="모달 예시" path="/modals" /> },
  { path: "/qa", element: <PlaceholderPage title="Q&A 게시판" path="/qa" /> },
  { path: "/qa/thread", element: <PlaceholderPage title="Q&A 스레드" path="/qa/thread" /> },
  { path: "/manual", element: <PlaceholderPage title="사용자 매뉴얼" path="/manual" /> },
];

export const SIDEBAR_GROUPS = [
  {
    title: "품목마스터",
    links: [
      { label: "카탈로그", path: "/" },
      { label: "연결 검증", path: "/connection-test" },
      { label: "상세 보기", path: "/detail" },
      { label: "수정·등록", path: "/edit" },
      { label: "모달 예시", path: "/modals" },
      { label: "ListPage 데모", path: "/list-demo" },
    ],
  },
  {
    title: "도움말",
    links: [
      { label: "Q&A 게시판", path: "/qa" },
      { label: "Q&A 스레드", path: "/qa/thread" },
      { label: "매뉴얼", path: "/manual" },
    ],
  },
  {
    title: "로그인",
    links: [{ label: "로그인 화면", path: "/login" }],
  },
];

export const GNB_ITEMS = [
  { label: "홈", path: "/" },
  { label: "품목", path: "/detail" },
  { label: "Q&A", path: "/qa" },
  { label: "매뉴얼", path: "/manual" },
];
