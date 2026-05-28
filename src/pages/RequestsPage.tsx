import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  type ICellRendererParams,
  type ColDef,
} from "ag-grid-community";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchRequests,
  computeStats,
  filterRows,
  STATUS_LABEL,
  type RequestRow,
  type StatusFilter,
  type TabKey,
  type RequestStatus,
} from "../lib/requestsQueries";

ModuleRegistry.registerModules([AllCommunityModule]);

// Lucide SVG (Edit / Trash / Ban) — emoji 대신 단순 아이콘
const ICON_EDIT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`;
const ICON_TRASH = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1.5 14a2 2 0 0 1-2 2H8.5a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
const ICON_BAN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;

function NumCell({ value }: ICellRendererParams) {
  if (!value) return null;
  return <span className="font-mono font-semibold" style={{ color: "#003876" }}>{value}</span>;
}

function CompanySiteCell({ data }: ICellRendererParams<RequestRow>) {
  if (!data) return null;
  return (
    <div className="flex flex-col leading-tight">
      <span>{data.companyCode || data.companyName || "-"}</span>
      {data.siteName && (
        <span className="text-[11px] text-text-sub">
          {data.siteCode && <span className="font-mono mr-1">[{data.siteCode}]</span>}
          {data.siteName}
        </span>
      )}
    </div>
  );
}

function ItemNameCell({ data }: ICellRendererParams<RequestRow>) {
  if (!data) return null;
  const main = data.normalized_name || data.item_name;
  const showSub = data.normalized_name && data.normalized_name !== data.item_name;
  return (
    <div className="flex flex-col leading-tight">
      <span className="font-medium">{main}</span>
      {showSub && <span className="text-[11px] text-text-sub">신청: {data.item_name}</span>}
    </div>
  );
}

function CodeCell({ value }: ICellRendererParams) {
  if (!value) return <span className="text-text-sub text-sm">— 발급 대기</span>;
  return <span className="font-mono font-semibold" style={{ color: "#003876" }}>{value}</span>;
}

function StatusCell({ value }: ICellRendererParams) {
  const s = STATUS_LABEL[value as RequestStatus] ?? { cls: "draft", label: value };
  return <span className={`stb ${s.cls}`}>{s.label}</span>;
}

function ActionCell({ data }: ICellRendererParams<RequestRow>) {
  if (!data) return null;
  const canEdit = !["APPROVED", "REJECTED", "REVOKED"].includes(data.status);
  const canRevoke = data.status === "APPROVED";
  return (
    <div className="row-act">
      {canEdit && (
        <button className="ibtn" title="수정" dangerouslySetInnerHTML={{ __html: ICON_EDIT }} />
      )}
      {canEdit && (
        <button className="ibtn del" title="삭제" dangerouslySetInnerHTML={{ __html: ICON_TRASH }} />
      )}
      {canRevoke && (
        <button className="ibtn del" title="승인 취소" dangerouslySetInnerHTML={{ __html: ICON_BAN }} />
      )}
    </div>
  );
}

export function RequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("my");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const requestsQuery = useQuery({
    queryKey: ["requests", tab, user?.id],
    queryFn: () => fetchRequests({ tab, userId: user!.id }),
    enabled: !!user,
    staleTime: 30_000,
  });

  const allRows = requestsQuery.data ?? [];
  const stats = useMemo(() => computeStats(allRows), [allRows]);
  const filtered = useMemo(() => filterRows(allRows, statusFilter, search), [allRows, statusFilter, search]);

  const columnDefs = useMemo<ColDef<RequestRow>[]>(
    () => [
      {
        headerName: "신청일자",
        field: "created_at",
        width: 110,
        cellClass: "cell-readonly num",
        valueFormatter: (p) =>
          p.value ? new Date(p.value as string).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, "-").replace(/\.$/, "") : "",
      },
      { headerName: "요청번호", field: "request_number", width: 140, cellClass: "cell-readonly num", cellRenderer: NumCell },
      { headerName: "신청자", field: "requesterName", width: 100, cellClass: "cell-readonly", valueFormatter: (p) => (p.value as string) || "-" },
      { headerName: "법인/사업장", width: 180, cellClass: "cell-readonly", cellRenderer: CompanySiteCell, sortable: false },
      {
        headerName: "품목명",
        field: "item_name",
        flex: 1,
        minWidth: 240,
        cellClass: "cell-readonly",
        autoHeight: true,
        cellRenderer: ItemNameCell,
      },
      { headerName: "제조사", field: "maker", width: 130, cellClass: "cell-readonly", valueFormatter: (p) => (p.value as string) || "-" },
      { headerName: "품목코드", field: "item_code", width: 160, cellClass: "cell-readonly num", cellRenderer: CodeCell },
      { headerName: "상태", field: "status", width: 130, cellClass: "cell-readonly", cellRenderer: StatusCell },
      { headerName: "", width: 90, cellClass: "cell-readonly", sortable: false, cellRenderer: ActionCell },
    ],
    [],
  );

  const statCards: Array<{ key: StatusFilter; label: string; icon?: string; count: number; tone?: "warn" | "alert" | "success" }> = [
    { key: "all", label: "전체", count: stats.all },
    { key: "needs_action", label: "보완 요청", icon: "⚠", count: stats.needs_action, tone: "alert" },
    { key: "pending", label: "검토 대기", icon: "⏳", count: stats.pending, tone: "warn" },
    { key: "approved", label: "승인 완료", icon: "✓", count: stats.approved, tone: "success" },
    { key: "rejected", label: "반려", icon: "✕", count: stats.rejected, tone: "alert" },
  ];

  return (
    <section className="page-card">
      <div className="page-h">
        <div>
          <h1>
            요청목록
            <span className="text-xs text-gray-500 font-normal ml-2">/ requests</span>
          </h1>
          <div className="meta">품목코드 등록 요청 관리 · 카드 클릭으로 상태별 필터 · 행 클릭으로 검토 상세 이동</div>
        </div>
        <div className="actions">
          <button className="btn-pri" onClick={() => navigate("/request")}>+ 신규 등록</button>
        </div>
      </div>

      {/* Stats 5 카드 */}
      <div className="stats-grid" style={{ marginBottom: 14 }}>
        {statCards.map((s) => (
          <div
            key={s.key}
            className={`stat-card${statusFilter === s.key ? " active" : ""}${s.tone ? " " + s.tone : ""}`}
            onClick={() => setStatusFilter(s.key)}
          >
            <div className="stat-h">
              {s.icon && <span>{s.icon}</span>}
              <span>{s.label}</span>
            </div>
            <div className="stat-val">{s.count}</div>
          </div>
        ))}
      </div>

      {/* 검색 행 (탭 인라인) */}
      <div className="search-row" style={{ marginBottom: 14 }}>
        <div className="tab-inline">
          <button className={tab === "my" ? "active" : ""} onClick={() => setTab("my")}>내 요청</button>
          <button className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>전체 요청</button>
        </div>
        <input
          type="search"
          placeholder="요청번호 · 품목명 · 신청자 · 법인 · 사업장 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="count">
          조회 결과 <b>{filtered.length}</b>건 / 전체 {allRows.length}건
        </span>
      </div>

      <div className="section-title">요청 목록 (정렬·필터·리사이즈 · 행 클릭 시 검토 상세)</div>
      <div className="ag-theme-quartz" style={{ height: 600, cursor: "pointer" }}>
        <AgGridReact<RequestRow>
          columnDefs={columnDefs}
          rowData={filtered}
          rowHeight={52}
          headerHeight={36}
          suppressCellFocus
          suppressMenuHide
          defaultColDef={{
            sortable: true,
            resizable: true,
            filter: "agTextColumnFilter",
            menuTabs: ["filterMenuTab", "generalMenuTab"],
          }}
          pagination
          paginationPageSize={50}
          paginationPageSizeSelector={[25, 50, 100]}
          onRowClicked={(e) => {
            if (e.data) navigate(`/approval/${e.data.id}`);
          }}
        />
      </div>
    </section>
  );
}
