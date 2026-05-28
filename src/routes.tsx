import { type RouteObject } from "react-router-dom";
import { lazy, Suspense } from "react";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { ConnectionTestPage } from "./pages/ConnectionTestPage";
import { LoginPage } from "./pages/LoginPage";
import type { SidebarItem } from "./components/layout/Sidebar";

// AG-Grid가 들어간 페이지들은 별도 청크로 → 첫 페이지가 비-그리드일 때 1.1MB 절약
const ListPage = lazy(() => import("./pages/ListPage").then((m) => ({ default: m.ListPage })));
const CatalogPage = lazy(() => import("./pages/CatalogPage").then((m) => ({ default: m.CatalogPage })));
const RequestsPage = lazy(() => import("./pages/RequestsPage").then((m) => ({ default: m.RequestsPage })));
const ApprovalDetailPage = lazy(() => import("./pages/ApprovalDetailPage").then((m) => ({ default: m.ApprovalDetailPage })));
const ItemRequestPage = lazy(() => import("./pages/ItemRequestPage").then((m) => ({ default: m.ItemRequestPage })));

function PageLoader() {
  return <div className="p-6 text-text-sub">로딩 중…</div>;
}

function withSuspense(node: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{node}</Suspense>;
}

const ph = (title: string, path: string) => <PlaceholderPage title={title} path={path} />;

export const routes: RouteObject[] = [
  // 진입
  { path: "/", element: withSuspense(<CatalogPage />) },

  // 품목등록 그룹
  { path: "/request", element: withSuspense(<ItemRequestPage />) },
  { path: "/request/new", element: withSuspense(<ItemRequestPage />) },
  { path: "/requests", element: withSuspense(<RequestsPage />) },
  { path: "/approval/:id", element: withSuspense(<ApprovalDetailPage />) },

  // 품목마스터
  { path: "/catalog", element: withSuspense(<CatalogPage />) },
  { path: "/catalog/upload", element: ph("데이터 업로드", "/catalog/upload") },

  // 분류관리
  { path: "/classification/tree", element: ph("분류 체계", "/classification/tree") },
  { path: "/classification/mapping", element: ph("분류-속성 매핑", "/classification/mapping") },
  { path: "/classification/include-in-name", element: ph("품목명 관리", "/classification/include-in-name") },

  // 속성마스터
  { path: "/attribute/list", element: ph("속성 목록", "/attribute/list") },
  { path: "/unit", element: ph("단위 관리", "/unit") },

  // 제조사관리
  { path: "/maker-model", element: ph("제조사리스트", "/maker-model") },

  // AI 관리 (admin)
  { path: "/ai/dashboard", element: ph("AI 시스템 현황", "/ai/dashboard") },
  { path: "/ai/quality", element: ph("AI 분류 정확도", "/ai/quality") },
  { path: "/admin/ai-review", element: ph("AI 1차 검토 통계", "/admin/ai-review") },

  // 시스템관리
  { path: "/admin/users", element: ph("사용자관리", "/admin/users") },
  { path: "/admin/reviewers", element: ph("검토자 설정", "/admin/reviewers") },
  { path: "/admin/organization", element: ph("조직관리", "/admin/organization") },
  { path: "/admin/erp", element: ph("배포ERP관리", "/admin/erp") },
  { path: "/distribution", element: ph("ERP배포현황", "/distribution") },

  // 개선요청
  { path: "/qna", element: ph("개선요청 (Q&A)", "/qna") },

  // 인증
  { path: "/login", element: <LoginPage /> },

  // 개발 전용 — 메뉴에서 숨김
  { path: "/list-demo", element: withSuspense(<ListPage />) },
  { path: "/connection-test", element: <ConnectionTestPage /> },
];

// v1 menuItems와 동일 구조: 확장형 그룹 + children + adminOnly + highlight
export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    label: "품목등록",
    icon: "request",
    children: [
      { label: "신규 등록", path: "/request/new" },
      { label: "요청목록", path: "/requests" },
    ],
  },
  {
    label: "품목마스터",
    icon: "master",
    children: [
      { label: "품목 카탈로그", path: "/catalog" },
      { label: "데이터 업로드", path: "/catalog/upload" },
    ],
  },
  {
    label: "분류관리",
    icon: "tree",
    children: [
      { label: "분류 체계", path: "/classification/tree" },
      { label: "분류-속성 매핑", path: "/classification/mapping" },
      { label: "품목명 관리 (관리자용)", path: "/classification/include-in-name", adminOnly: true },
    ],
  },
  {
    label: "속성마스터",
    icon: "tag",
    children: [
      { label: "속성 목록", path: "/attribute/list" },
      { label: "단위 관리", path: "/unit" },
    ],
  },
  {
    label: "제조사관리",
    icon: "factory",
    children: [
      { label: "제조사리스트", path: "/maker-model" },
    ],
  },
  {
    label: "AI 관리",
    icon: "ai",
    children: [
      { label: "AI 시스템 현황", path: "/ai/dashboard", adminOnly: true },
      { label: "AI 분류 정확도", path: "/ai/quality", adminOnly: true },
      { label: "AI 1차 검토 통계", path: "/admin/ai-review", adminOnly: true },
    ],
  },
  {
    label: "시스템관리",
    icon: "settings",
    children: [
      { label: "사용자관리", path: "/admin/users" },
      { label: "검토자 설정", path: "/admin/reviewers" },
      { label: "조직관리", path: "/admin/organization" },
      { label: "배포ERP관리", path: "/admin/erp" },
      { label: "ERP배포현황", path: "/distribution" },
    ],
  },
  {
    label: "개선요청 (Q&A)",
    icon: "chat",
    path: "/qna",
    highlight: true,
  },
];

export const GNB_ITEMS = [
  { label: "홈", path: "/" },
  { label: "품목", path: "/detail" },
  { label: "Q&A", path: "/qna" },
  { label: "매뉴얼", path: "/manual" },
];
