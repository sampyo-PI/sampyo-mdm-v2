import { type RouteObject } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ConnectionTestPage } from "./pages/ConnectionTestPage";
import { LoginPage } from "./pages/LoginPage";
import type { SidebarItem } from "./components/layout/Sidebar";

// AG-Grid가 들어간 페이지들은 별도 청크로 → 첫 페이지가 비-그리드일 때 1.1MB 절약
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const DistributionRequestsPage = lazy(() => import("./pages/DistributionRequestsPage").then((m) => ({ default: m.DistributionRequestsPage })));
const ListPage = lazy(() => import("./pages/ListPage").then((m) => ({ default: m.ListPage })));
const CatalogPage = lazy(() => import("./pages/CatalogPage").then((m) => ({ default: m.CatalogPage })));
const CatalogV2Page = lazy(() => import("./pages/CatalogV2Page").then((m) => ({ default: m.CatalogV2Page })));
const Cat2RegisterPage = lazy(() => import("./pages/Cat2RegisterPage").then((m) => ({ default: m.Cat2RegisterPage })));
const RequestsPage = lazy(() => import("./pages/RequestsPage").then((m) => ({ default: m.RequestsPage })));
const ApprovalDetailPage = lazy(() => import("./pages/ApprovalDetailPage").then((m) => ({ default: m.ApprovalDetailPage })));
const ItemRequestPage = lazy(() => import("./pages/ItemRequestPage").then((m) => ({ default: m.ItemRequestPage })));
const QAListPage = lazy(() => import("./pages/QAListPage").then((m) => ({ default: m.QAListPage })));
const QAThreadPage = lazy(() => import("./pages/QAThreadPage").then((m) => ({ default: m.QAThreadPage })));
const ManualPage = lazy(() => import("./pages/ManualPage").then((m) => ({ default: m.ManualPage })));
const AIDashboardPage = lazy(() => import("./pages/AIDashboardPage").then((m) => ({ default: m.AIDashboardPage })));
const AIQualityPage = lazy(() => import("./pages/AIQualityPage").then((m) => ({ default: m.AIQualityPage })));
const AdminAIReviewPage = lazy(() => import("./pages/AdminAIReviewPage").then((m) => ({ default: m.AdminAIReviewPage })));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage").then((m) => ({ default: m.UserManagementPage })));
const AdminReviewersPage = lazy(() => import("./pages/AdminReviewersPage").then((m) => ({ default: m.AdminReviewersPage })));
const OrganizationPage = lazy(() => import("./pages/OrganizationPage").then((m) => ({ default: m.OrganizationPage })));
const ERPAdminPage = lazy(() => import("./pages/ERPAdminPage").then((m) => ({ default: m.ERPAdminPage })));
const DistributionMonitorPage = lazy(() => import("./pages/DistributionMonitorPage").then((m) => ({ default: m.DistributionMonitorPage })));
const ClassificationTreePage = lazy(() => import("./pages/ClassificationTreePage").then((m) => ({ default: m.ClassificationTreePage })));
const ClassificationMappingPage = lazy(() => import("./pages/ClassificationMappingPage").then((m) => ({ default: m.ClassificationMappingPage })));
const AttributeListPage = lazy(() => import("./pages/AttributeListPage").then((m) => ({ default: m.AttributeListPage })));
const UnitListPage = lazy(() => import("./pages/UnitListPage").then((m) => ({ default: m.UnitListPage })));
const MakerListPage = lazy(() => import("./pages/MakerListPage").then((m) => ({ default: m.MakerListPage })));
const CatalogUploadPage = lazy(() => import("./pages/CatalogUploadPage").then((m) => ({ default: m.CatalogUploadPage })));
const IncludeInNameReviewPage = lazy(() => import("./pages/IncludeInNameReviewPage").then((m) => ({ default: m.IncludeInNameReviewPage })));

function PageLoader() {
  return <div className="p-6 text-text-sub">로딩 중…</div>;
}

function withSuspense(node: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{node}</Suspense>;
}

export const routes: RouteObject[] = [
  // 진입
  { path: "/", element: withSuspense(<DashboardPage />) },
  { path: "/dashboard", element: withSuspense(<DashboardPage />) },

  // 품목등록 그룹
  { path: "/request", element: withSuspense(<ItemRequestPage />) },
  { path: "/request/new", element: withSuspense(<ItemRequestPage />) },
  { path: "/request-std", element: withSuspense(<Cat2RegisterPage />) },
  { path: "/requests", element: withSuspense(<RequestsPage />) },
  { path: "/distribution-requests", element: withSuspense(<DistributionRequestsPage />) },
  { path: "/approval/:id", element: withSuspense(<ApprovalDetailPage />) },

  // 품목마스터
  { path: "/catalog", element: withSuspense(<CatalogPage />) },
  { path: "/catalog-std", element: withSuspense(<CatalogV2Page />) },
  { path: "/catalog/upload", element: withSuspense(<CatalogUploadPage />) },

  // 분류관리
  { path: "/classification/tree", element: withSuspense(<ClassificationTreePage />) },
  { path: "/classification/mapping", element: withSuspense(<ClassificationMappingPage />) },
  { path: "/classification/include-in-name", element: withSuspense(<IncludeInNameReviewPage />) },

  // 속성마스터
  { path: "/attribute/list", element: withSuspense(<AttributeListPage />) },
  { path: "/unit", element: withSuspense(<UnitListPage />) },

  // 제조사관리
  { path: "/maker-model", element: withSuspense(<MakerListPage />) },

  // AI 관리 (admin)
  { path: "/ai/dashboard", element: withSuspense(<AIDashboardPage />) },
  { path: "/ai/quality", element: withSuspense(<AIQualityPage />) },
  { path: "/admin/ai-review", element: withSuspense(<AdminAIReviewPage />) },

  // 시스템관리
  { path: "/admin/users", element: withSuspense(<UserManagementPage />) },
  { path: "/admin/reviewers", element: withSuspense(<AdminReviewersPage />) },
  { path: "/admin/organization", element: withSuspense(<OrganizationPage />) },
  { path: "/admin/erp", element: withSuspense(<ERPAdminPage />) },
  { path: "/distribution", element: withSuspense(<DistributionMonitorPage />) },

  // 개선요청
  { path: "/qna", element: withSuspense(<QAListPage />) },
  { path: "/qna/thread/:id", element: withSuspense(<QAThreadPage />) },

  // 매뉴얼
  { path: "/manual", element: withSuspense(<ManualPage />) },

  // 인증
  { path: "/login", element: <LoginPage /> },

  // 개발 전용 — 메뉴에서 숨김
  { path: "/list-demo", element: withSuspense(<ListPage />) },
  { path: "/connection-test", element: <ConnectionTestPage /> },
];

// v1 menuItems와 동일 구조: 확장형 그룹 + children + adminOnly + highlight
export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    label: "대시보드",
    icon: "dashboard",
    path: "/",
  },
  {
    label: "품목등록",
    icon: "request",
    children: [
      { label: "신규 등록", path: "/request/new" },
      { label: "요청목록", path: "/requests" },
      { label: "배포 요청 관리", path: "/distribution-requests" },
    ],
  },
  {
    label: "품목마스터",
    icon: "master",
    children: [
      { label: "품목 카탈로그", path: "/catalog" },
      { label: "데이터 업로드", path: "/catalog/upload", adminOnly: true },
    ],
  },
  {
    label: "분류관리",
    icon: "tree",
    children: [
      { label: "분류 체계", path: "/classification/tree" },
      { label: "분류-속성 매핑", path: "/classification/mapping" },
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
    adminOnly: true,
    children: [
      { label: "사용자관리", path: "/admin/users", adminOnly: true },
      { label: "검토자 설정", path: "/admin/reviewers", adminOnly: true },
      { label: "조직관리", path: "/admin/organization", adminOnly: true },
      { label: "배포ERP관리", path: "/admin/erp", adminOnly: true },
      { label: "ERP배포현황", path: "/distribution", adminOnly: true },
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
