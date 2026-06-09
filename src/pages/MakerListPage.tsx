import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef, type GridApi, type GridReadyEvent, type ICellRendererParams } from "ag-grid-community";
import { rest, rpc } from "../lib/supabase";
import { GridPager } from "../components/common/GridPager";

ModuleRegistry.registerModules([AllCommunityModule]);

type MakerRow = { code: string; name: string; description: string | null; is_active: boolean };
type Maker = { code: string; name: string; description: string; usage: number; is_active: boolean };

const CodeChip = ({ value }: { value: string }) => <span className="maker-code">{value}</span>;
const UsageCell = ({ value, max }: { value: number; max: number }) => {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span className="t-mono t-meta" style={{ minWidth: 48 }}>{value.toLocaleString()}</span>
      <div className="usage-bar"><div className="fill" style={{ width: `${pct}%` }}></div></div>
    </div>
  );
};
const StatusBadge = ({ on }: { on: boolean }) => <span className={`badge-status ${on ? "active" : "inactive"}`}>{on ? "사용" : "미사용"}</span>;

type MergeState = "off" | "on";

async function fetchAllMakers(): Promise<MakerRow[]> {
  const out: MakerRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const chunk = await rest<MakerRow[]>("GET", "makers", {
      params: { select: "code,name,description,is_active", order: "name.asc", limit: "1000", offset: String(offset) },
    });
    out.push(...chunk);
    if (chunk.length < 1000) break;
  }
  return out;
}

export function MakerListPage() {
  const [search, setSearch] = useState("");
  const [mergeMode, setMergeMode] = useState<MergeState>("off");
  const [selected, setSelected] = useState<string[]>([]);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["v2-makers"],
    queryFn: async () => {
      const [makers, usage] = await Promise.all([fetchAllMakers(), rpc<Record<string, number>>("get_maker_usage_counts")]);
      return makers.map<Maker>((m) => ({
        code: m.code, name: m.name, description: m.description ?? "",
        is_active: m.is_active, usage: usage[m.name?.trim()] ?? 0,
      }));
    },
    staleTime: 60_000,
  });

  const maxUsage = useMemo(() => rows.reduce((m, r) => Math.max(m, r.usage), 0), [rows]);
  const activeCnt = useMemo(() => rows.filter(r => r.is_active).length, [rows]);
  const matchedCnt = useMemo(() => rows.filter(r => r.usage > 0).length, [rows]);
  const matchedItems = useMemo(() => rows.reduce((s, r) => s + r.usage, 0), [rows]);

  const ActionsCell = ({ data }: { data: Maker }) => (
    mergeMode === "on"
      ? <input type="checkbox" checked={selected.includes(data.code)} onChange={(e) => {
          if (e.target.checked) setSelected([...selected, data.code]);
          else setSelected(selected.filter(c => c !== data.code));
        }} />
      : (
        <div className="row-acts">
          <button className="ic-btn"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg></button>
          <button className="ic-btn del"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1.5 14a2 2 0 0 1-2 2H8.5a2 2 0 0 1-2-2L5 6"/></svg></button>
        </div>
      )
  );

  const columnDefs = useMemo<ColDef<Maker>[]>(() => ([
    { headerName: "코드", field: "code", width: 130, cellRenderer: (p: ICellRendererParams<Maker>) => <CodeChip value={p.value} /> },
    { headerName: "제조사명", field: "name", width: 220, cellStyle: { fontWeight: 600 } as any },
    { headerName: "사용 빈도 (items)", field: "usage", width: 220, cellRenderer: (p: ICellRendererParams<Maker>) => <UsageCell value={p.value} max={maxUsage} />, sort: "desc" },
    { headerName: "상태", field: "is_active", width: 80, cellRenderer: (p: ICellRendererParams<Maker>) => <StatusBadge on={p.value} />, filterValueGetter: (p) => p.data?.is_active ? "사용" : "미사용" },
    { headerName: "설명", field: "description", width: 280, cellStyle: { color: "#64748b", fontSize: "13px" } as any },
    { headerName: mergeMode === "on" ? "선택" : "관리", width: 90, cellRenderer: (p: ICellRendererParams<Maker>) => <ActionsCell data={p.data!} />, sortable: false, filter: false, cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any },
  ]), [mergeMode, selected, maxUsage]);

  const onGridReady = useCallback((e: GridReadyEvent) => { e.api.sizeColumnsToFit(); setGridApi(e.api); }, []);

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>제조사 리스트<span className="text-xs text-gray-500 font-normal ml-2">/ maker-model</span></h1>
          <div className="meta">{rows.length.toLocaleString()}개 제조사 마스터 · items.maker 매칭 (free-text){isLoading && " · 불러오는 중…"}</div>
        </div>
        <div className="actions">
          {mergeMode === "off" ? (
            <>
              <button className="btn-sec" onClick={() => { setMergeMode("on"); setSelected([]); }}>🔗 병합 모드</button>
              <button className="btn-primary">＋ 제조사 추가</button>
            </>
          ) : (
            <>
              <span className="t-meta">선택 <strong className="t-navy">{selected.length}개</strong></span>
              <button className="btn-sec" onClick={() => { setMergeMode("off"); setSelected([]); }}>취소</button>
              <button className="btn-primary" disabled={selected.length < 2}>병합 실행 ({selected.length})</button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3" style={{ marginTop: 16 }}>
        <div className="stat-card"><div className="stat-label">전체 제조사</div><div className="stat-val">{rows.length.toLocaleString()}</div><div className="stat-sub">사용 중 {activeCnt.toLocaleString()} · 미사용 {(rows.length - activeCnt).toLocaleString()}</div></div>
        <div className="stat-card"><div className="stat-label">items에서 사용 중</div><div className="stat-val">{matchedCnt.toLocaleString()}</div><div className="stat-sub">정확 일치 제조사 (free-text)</div></div>
        <div className="stat-card"><div className="stat-label">매칭 items 합계</div><div className="stat-val">{matchedItems.toLocaleString()}</div><div className="stat-sub">maker 보유 활성 items</div></div>
        <div className="stat-card"><div className="stat-label">미사용 마스터</div><div className="stat-val" style={{ color: "#b45309" }}>{(rows.length - matchedCnt).toLocaleString()}</div><div className="stat-sub">items 참조 0건 (정리 후보)</div></div>
      </div>

      {mergeMode === "on" && (
        <div className="callout-merge">
          🔗 <strong>병합 모드</strong> — 같은 제조사로 묶을 행 2개 이상 선택 후 "병합 실행". 첫 선택이 base, 나머지는 alias로 흡수됩니다.
        </div>
      )}

      <div className="maker-toolbar">
        <div className="search-box">
          <svg className="ic-search" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="제조사명 · 코드 검색…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="t-meta" style={{ marginLeft: "auto" }}>전체 <strong className="t-navy">{rows.length.toLocaleString()}개</strong></span>
        <GridPager api={gridApi} pageSizeOptions={[25, 50, 100]} />
      </div>

      <div className="ag-theme-quartz" style={{ height: 540 }}>
        <AgGridReact<Maker>
          rowData={rows}
          columnDefs={columnDefs}
          rowHeight={48} headerHeight={36}
          suppressCellFocus suppressMenuHide
          defaultColDef={{ sortable: true, resizable: true, filter: "agTextColumnFilter", menuTabs: ["filterMenuTab", "generalMenuTab"] }}
          pagination paginationPageSize={50} suppressPaginationPanel
          quickFilterText={search}
          onGridReady={onGridReady}
        />
      </div>
    </section>
  );
}

const PAGE_STYLES = `
.stat-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; }
.stat-card .stat-label { font-size: 12px; color: #64748b; }
.stat-card .stat-val { font-size: 22px; font-weight: 700; color: #003876; line-height: 1.1; margin-top: 4px; }
.stat-card .stat-sub { font-size: 11px; color: #94a3b8; margin-top: 4px; }

.callout-merge { background: #fef3c7; border-left: 3px solid #92400e; padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #78350f; margin-top: 16px; }

.maker-toolbar { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin: 16px 0 12px 0; display: flex; align-items: center; gap: 12px; }
.maker-toolbar .search-box { position: relative; flex: 1; max-width: 380px; }
.maker-toolbar .search-box input { width: 100%; padding: 8px 12px 8px 34px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: #1f2937; }
.maker-toolbar .search-box input:focus { outline: none; border-color: #003876; box-shadow: 0 0 0 2px rgba(0,56,118,0.1); }
.maker-toolbar .search-box .ic-search { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #94a3b8; }

.btn-primary { background: #003876; color: #fff; border: 1px solid #003876; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-primary:hover { background: #002a5c; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-sec { background: #fff; color: #003876; border: 1px solid #cbd5e1; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-sec:hover { background: #eff6ff; border-color: #003876; }

.maker-code { color: #003876; font-weight: 700; font-size: 12px; padding: 1px 8px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; font-family: ui-monospace, monospace; }
.alias-chip { display: inline-block; padding: 1px 7px; border-radius: 4px; font-size: 11px; background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; margin-right: 3px; }

.badge-status { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 600; line-height: 1.5; }
.badge-status.active { background: #ecfdf5; color: #047857; border: 1px solid #bbf7d0; }
.badge-status.inactive { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }

.usage-bar { width: 100px; height: 5px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
.usage-bar .fill { height: 100%; background: linear-gradient(90deg, #003876, #1e40af); }

.row-acts { display: flex; gap: 4px; justify-content: center; }
.row-acts .ic-btn { width: 28px; height: 28px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; border-radius: 6px; color: #475569; display: inline-flex; align-items: center; justify-content: center; }
.row-acts .ic-btn:hover { background: #eff6ff; color: #003876; border-color: #003876; }
.row-acts .ic-btn.del:hover { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
.row-acts svg { width: 14px; height: 14px; }

.t-mono { font-family: ui-monospace, monospace; }
.t-meta { font-size: 13px; font-weight: 500; color: #64748b; }
.t-navy { color: #003876 !important; }
`;
