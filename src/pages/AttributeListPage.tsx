import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef, type GridReadyEvent, type ICellRendererParams } from "ag-grid-community";
import { rest, rpc } from "../lib/supabase";

ModuleRegistry.registerModules([AllCommunityModule]);

type AttrRow = { id: string; code: string; name: string; data_type: string; unit: string | null; is_active: boolean; description: string | null };
type Attr = { code: string; name: string; data_type: string; unit: string | null; usage: number; is_active: boolean; description: string };

const TypeBadge = ({ value }: { value: string }) => {
  const labels: Record<string, string> = { text: "텍스트", number: "숫자", select: "선택", boolean: "T/F" };
  return <span className={`badge-type ${value}`}>{labels[value] ?? value}</span>;
};
const UsageCell = ({ value, max }: { value: number; max: number }) => {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span className="t-mono t-meta" style={{ minWidth: 36 }}>{value}</span>
      <div className="usage-bar"><div className="fill" style={{ width: `${pct}%` }}></div></div>
    </div>
  );
};
const StatusBadge = ({ on }: { on: boolean }) => (
  <span className={`badge-status ${on ? "active" : "inactive"}`}>{on ? "사용" : "미사용"}</span>
);
const CodeChip = ({ value }: { value: string }) => <span className="t-mono attr-code">{value}</span>;
const ActionsCell = () => (
  <div className="row-acts">
    <button className="ic-btn"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg></button>
    <button className="ic-btn del"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1.5 14a2 2 0 0 1-2 2H8.5a2 2 0 0 1-2-2L5 6"/></svg></button>
  </div>
);

type Filter = "all" | "active" | "inactive";

export function AttributeListPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["v2-attributes"],
    queryFn: async () => {
      const [attrs, usage] = await Promise.all([
        rest<AttrRow[]>("GET", "attributes", { params: { select: "id,code,name,data_type,unit,is_active,description", order: "name.asc", limit: "2000" } }),
        rpc<Record<string, number>>("get_attribute_usage_counts"),
      ]);
      return attrs.map<Attr>((a) => ({
        code: a.code, name: a.name, data_type: a.data_type, unit: a.unit,
        is_active: a.is_active, description: a.description ?? "",
        usage: usage[a.id] ?? 0,
      }));
    },
    staleTime: 60_000,
  });

  const maxUsage = useMemo(() => rows.reduce((m, r) => Math.max(m, r.usage), 0), [rows]);

  const columnDefs = useMemo<ColDef<Attr>[]>(() => ([
    { headerName: "속성 코드", field: "code", width: 130, cellRenderer: (p: ICellRendererParams<Attr>) => <CodeChip value={p.value} /> },
    { headerName: "속성명", field: "name", width: 150, cellStyle: { fontWeight: 600 } as any },
    { headerName: "데이터 타입", field: "data_type", width: 110, cellRenderer: (p: ICellRendererParams<Attr>) => <TypeBadge value={p.value} /> },
    { headerName: "단위", field: "unit", width: 80, cellClass: "t-mono", valueFormatter: (p) => p.value || "—" },
    { headerName: "사용 빈도 (매핑 소분류)", field: "usage", width: 200, cellRenderer: (p: ICellRendererParams<Attr>) => <UsageCell value={p.value} max={maxUsage} />, sort: "desc" },
    { headerName: "상태", field: "is_active", width: 80, cellRenderer: (p: ICellRendererParams<Attr>) => <StatusBadge on={p.value} />, filterValueGetter: (p) => p.data?.is_active ? "사용" : "미사용" },
    { headerName: "설명", field: "description", width: 300, cellStyle: { color: "#64748b", fontSize: "13px" } as any },
    { headerName: "관리", width: 90, cellRenderer: () => <ActionsCell />, sortable: false, filter: false, cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any },
  ]), [maxUsage]);

  const onGridReady = useCallback((e: GridReadyEvent) => { e.api.sizeColumnsToFit(); }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter(a => filter === "active" ? a.is_active : !a.is_active);
  }, [filter, rows]);

  const counts = useMemo(() => ({
    all: rows.length,
    active: rows.filter(r => r.is_active).length,
    inactive: rows.filter(r => !r.is_active).length,
  }), [rows]);

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>속성 목록<span className="text-xs text-gray-500 font-normal ml-2">/ attribute/list</span></h1>
          <div className="meta">{counts.all}개 속성 마스터 — 카탈로그 분류별 매핑에 사용{isLoading && " · 불러오는 중…"}</div>
        </div>
        <div className="actions">
          <button className="btn-primary">＋ 속성 추가</button>
        </div>
      </div>

      <div className="attr-toolbar">
        <div className="search-box">
          <svg className="ic-search" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="속성명 · 코드 검색…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-tags">
          <button className={`filter-tag ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>전체 {counts.all}</button>
          <button className={`filter-tag ${filter === "active" ? "on" : ""}`} onClick={() => setFilter("active")}>사용 중 {counts.active}</button>
          <button className={`filter-tag ${filter === "inactive" ? "on" : ""}`} onClick={() => setFilter("inactive")}>미사용 {counts.inactive}</button>
        </div>
        <span style={{ flex: 1 }}></span>
        <span className="t-meta">총 <strong className="t-navy">{counts.all}건</strong></span>
      </div>

      <div className="ag-theme-quartz" style={{ height: 560 }}>
        <AgGridReact<Attr>
          rowData={filtered}
          columnDefs={columnDefs}
          rowHeight={48} headerHeight={36}
          suppressCellFocus suppressMenuHide
          defaultColDef={{ sortable: true, resizable: true, filter: "agTextColumnFilter", menuTabs: ["filterMenuTab", "generalMenuTab"] }}
          pagination paginationPageSize={50} paginationPageSizeSelector={[25, 50, 100]}
          quickFilterText={search}
          onGridReady={onGridReady}
        />
      </div>
    </section>
  );
}

const PAGE_STYLES = `
.attr-toolbar { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin: 16px 0 12px 0; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.attr-toolbar .search-box { position: relative; flex: 1; max-width: 380px; }
.attr-toolbar .search-box input { width: 100%; padding: 8px 12px 8px 34px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: #1f2937; }
.attr-toolbar .search-box input:focus { outline: none; border-color: #003876; box-shadow: 0 0 0 2px rgba(0,56,118,0.1); }
.attr-toolbar .search-box .ic-search { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #94a3b8; }
.filter-tags { display: inline-flex; gap: 6px; }
.filter-tag { padding: 4px 10px; border: 1px solid #cbd5e1; background: #fff; border-radius: 999px; cursor: pointer; font-size: 12px; font-weight: 500; color: #475569; }
.filter-tag:hover { background: #eff6ff; border-color: #003876; color: #003876; }
.filter-tag.on { background: #003876; color: #fff; border-color: #003876; }

.btn-primary { background: #003876; color: #fff; border: 1px solid #003876; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-primary:hover { background: #002a5c; }

.attr-code { color: #003876; font-weight: 600; font-size: 12px; padding: 1px 7px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; }

.badge-type { display: inline-block; padding: 1px 7px; border-radius: 4px; font-size: 11px; font-weight: 600; line-height: 1.5; }
.badge-type.text { background: #e0f2fe; color: #075985; border: 1px solid #bae6fd; }
.badge-type.number { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.badge-type.boolean { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }
.badge-type.select { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }

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

.t-mono { font-family: ui-monospace, SFMono-Regular, monospace; }
.t-meta { font-size: 13px; font-weight: 500; color: #64748b; }
.t-navy { color: #003876 !important; }
`;
