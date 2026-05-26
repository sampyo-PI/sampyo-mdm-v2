import { type RouteObject } from "react-router-dom";
import { ListPage } from "./pages/ListPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { ConnectionTestPage } from "./pages/ConnectionTestPage";

/**
 * SDS 8 페이지 라우팅. ListPage / ConnectionTest만 실 구현, 나머지는 PlaceholderPage.
 * Phase 1+에서 페이지별 풀 구현.
 */
export const routes: RouteObject[] = [
  { path: "/", element: <ListPage /> },
  { path: "/connection-test", element: <ConnectionTestPage /> },
  { path: "/detail", element: <PlaceholderPage title="품목 상세" path="/detail" /> },
  { path: "/edit", element: <PlaceholderPage title="품목 수정·등록" path="/edit" /> },
  { path: "/login", element: <PlaceholderPage title="로그인" path="/login" /> },
  { path: "/modals", element: <PlaceholderPage title="모달 예시" path="/modals" /> },
  { path: "/qa", element: <PlaceholderPage title="Q&A 게시판" path="/qa" /> },
  { path: "/qa/thread", element: <PlaceholderPage title="Q&A 스레드" path="/qa/thread" /> },
  { path: "/manual", element: <PlaceholderPage title="사용자 매뉴얼" path="/manual" /> },
];

export const SIDEBAR_GROUPS = [
  {
    title: "품목마스터",
    links: [
      { label: "목록 (표준)", path: "/" },
      { label: "연결 검증", path: "/connection-test" },
      { label: "상세 보기", path: "/detail" },
      { label: "수정·등록", path: "/edit" },
      { label: "모달 예시", path: "/modals" },
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
