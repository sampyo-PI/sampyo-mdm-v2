import { useCallback, useRef, useState, type RefObject } from "react";
import type { GridApi } from "ag-grid-community";

/** AG-Grid 페이지네이션 상태 보유 훅 (onGridReady에서 gridApiRef.current=e.api 설정 + grid에 onPaginationChanged 연결) */
export function useGridPager(initialPageSize = 50) {
  const gridApiRef = useRef<GridApi | null>(null);
  const [pageState, setPageState] = useState({ page: 0, pageSize: initialPageSize, totalPages: 1 });
  const onPaginationChanged = useCallback(() => {
    const api = gridApiRef.current;
    // unmount(라우팅 이동) 시 AG-Grid가 파괴되며 paginationChanged를 발화 →
    // 파괴된 API 호출 시 에러로 네비게이션이 멈추므로 가드.
    if (!api || api.isDestroyed?.()) return;
    try {
      setPageState({
        page: api.paginationGetCurrentPage(),
        pageSize: api.paginationGetPageSize(),
        totalPages: Math.max(1, api.paginationGetTotalPages()),
      });
    } catch { /* grid 파괴 타이밍 — 무시 */ }
  }, []);
  return { gridApiRef, pageState, setPageState, onPaginationChanged };
}

/** 공용 커스텀 페이저 — 카탈로그/속성/단위/제조사 등 AG-Grid 페이지 상단 우측 통일 배치.
 *  클라이언트사이드: totalPages = pageState.totalPages / 서버사이드(Infinite): 부모가 totalCount로 계산해 전달. */
export function GridPager({
  apiRef, page, pageSize, totalPages, pageSizeOptions = [25, 50, 100, 200],
}: {
  apiRef: RefObject<GridApi | null>;
  page: number;
  pageSize: number;
  totalPages: number;
  pageSizeOptions?: number[];
}) {
  return (
    <div className="grid-pager">
      <select value={pageSize} onChange={(e) => apiRef.current?.setGridOption("paginationPageSize", Number(e.target.value))}>
        {pageSizeOptions.map((n) => <option key={n} value={n}>{n}개</option>)}
      </select>
      <button className="nav" type="button" onClick={() => apiRef.current?.paginationGoToPreviousPage()} disabled={page <= 0}>‹</button>
      <span className="pos">{page + 1} / {totalPages}</span>
      <button className="nav" type="button" onClick={() => apiRef.current?.paginationGoToNextPage()} disabled={page >= totalPages - 1}>›</button>
      <style>{`
        .grid-pager { display: inline-flex; align-items: center; gap: 6px; font-size: var(--app-fs-sm, 13px); color: var(--c-text-sub, #64748b); }
        .grid-pager select { border: 1px solid var(--c-border, #cbd5e1); border-radius: 6px; padding: 5px 8px; font-size: var(--app-fs-sm, 13px); color: var(--c-text, #1f2937); }
        .grid-pager .nav { width: 28px; height: 28px; border: 1px solid var(--c-border, #cbd5e1); background: #fff; border-radius: 6px; cursor: pointer; color: var(--c-navy-600, #003876); font-size: 14px; line-height: 1; }
        .grid-pager .nav:hover:not(:disabled) { background: #eff6ff; border-color: var(--c-navy-600, #003876); }
        .grid-pager .nav:disabled { opacity: .4; cursor: not-allowed; }
        .grid-pager .pos { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--c-navy-600, #003876); }
      `}</style>
    </div>
  );
}
