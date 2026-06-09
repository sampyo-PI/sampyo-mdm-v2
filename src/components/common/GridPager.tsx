import { useEffect, useState, type CSSProperties } from "react";
import type { GridApi } from "ag-grid-community";

/**
 * 공용 커스텀 페이저 — AG-Grid 페이지(카탈로그/속성/단위/제조사 등) 툴바 우측 통일 배치.
 *
 * 안전 재설계 (2026-06-09) — 이전 시도(useGridPager 훅 + onPaginationChanged 프롭)는
 * 페이지 상태를 "부모 페이지"에 두어 클라이언트사이드 그리드에서 네비게이션이 멈췄다
 * (URL 변경 / 렌더 정지). 원인 2가지:
 *   1) 부모 re-render → rowData/columnDefs 재생성 → 그리드 reset → paginationChanged 재발화 → 루프
 *   2) 언마운트(라우팅) 시 AG-Grid가 grid를 파괴하며 paginationChanged 발화 →
 *      부모 setState가 파괴된 api 호출 → throw → 네비게이션 멈춤
 *   (Infinite 카탈로그는 rowData 프롭이 없어 같은 패턴이어도 살아남음)
 *
 * 본 컴포넌트는 자체(leaf) 상태만 보유 → 페이지 이동 시 부모는 re-render 안 됨.
 * paginationChanged 는 api.addEventListener 로 구독하고 cleanup 에서 반드시 해제,
 * 모든 api 호출 전 isDestroyed 가드 → 두 원인 모두 차단.
 *
 * 사용:
 *   const [gridApi, setGridApi] = useState<GridApi | null>(null);
 *   const onGridReady = useCallback((e: GridReadyEvent) => { e.api.sizeColumnsToFit(); setGridApi(e.api); }, []);
 *   <AgGridReact ... pagination paginationPageSize={50} suppressPaginationPanel onGridReady={onGridReady} />
 *   <GridPager api={gridApi} pageSizeOptions={[25, 50, 100]} />
 */
export function GridPager({
  api,
  pageSizeOptions = [25, 50, 100, 200],
  style,
}: {
  api: GridApi | null;
  pageSizeOptions?: number[];
  style?: CSSProperties;
}) {
  const [s, setS] = useState({ page: 0, pageSize: pageSizeOptions[1] ?? 50, totalPages: 1 });

  useEffect(() => {
    if (!api) return;
    const sync = () => {
      if (api.isDestroyed?.()) return;
      setS({
        page: api.paginationGetCurrentPage(),
        pageSize: api.paginationGetPageSize(),
        totalPages: Math.max(1, api.paginationGetTotalPages()),
      });
    };
    sync(); // 초기 동기화 (grid 데이터가 이미 로드된 경우 대비)
    api.addEventListener("paginationChanged", sync);
    return () => {
      // 언마운트 순서상 grid가 먼저 파괴될 수 있으므로 가드 후 해제.
      if (!api.isDestroyed?.()) api.removeEventListener("paginationChanged", sync);
    };
  }, [api]);

  const act = (fn: (a: GridApi) => void) => {
    if (api && !api.isDestroyed?.()) fn(api);
  };

  return (
    <div className="grid-pager" style={style}>
      <select
        value={s.pageSize}
        onChange={(e) => act((a) => a.setGridOption("paginationPageSize", Number(e.target.value)))}
      >
        {pageSizeOptions.map((n) => <option key={n} value={n}>{n}개</option>)}
      </select>
      <button className="nav" type="button" onClick={() => act((a) => a.paginationGoToPreviousPage())} disabled={s.page <= 0}>‹</button>
      <span className="pos">{s.page + 1} / {s.totalPages}</span>
      <button className="nav" type="button" onClick={() => act((a) => a.paginationGoToNextPage())} disabled={s.page >= s.totalPages - 1}>›</button>
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
