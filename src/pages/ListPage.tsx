import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { useMemo, useState } from "react";

ModuleRegistry.registerModules([AllCommunityModule]);

type Row = {
  code: string;
  name: string;
  cls: string;
  uom: string;
  status: "승인" | "검토대기" | "초안" | "반려";
  reg: string;
  upd: string;
};

const DEMO_ROWS: Row[] = [
  { code: "M-OPC-001", name: "보통 포틀랜드 시멘트 1종", cls: "원재료", uom: "ton", status: "승인", reg: "2024-03-01", upd: "2026-05-10" },
  { code: "M-OPC-002", name: "조강 포틀랜드 시멘트 3종", cls: "원재료", uom: "ton", status: "승인", reg: "2024-03-01", upd: "2026-04-22" },
  { code: "M-FA-101", name: "플라이애시 (FA)", cls: "원재료", uom: "ton", status: "승인", reg: "2024-06-10", upd: "2026-02-18" },
  { code: "M-AGG-25", name: "굵은골재 25mm", cls: "원재료", uom: "m³", status: "승인", reg: "2024-06-10", upd: "2026-03-05" },
  { code: "M-SAND-S1", name: "잔골재 (천연)", cls: "원재료", uom: "m³", status: "검토대기", reg: "2026-05-18", upd: "2026-05-21" },
  { code: "P-RMC-240", name: "레미콘 25-24-150", cls: "완제품", uom: "m³", status: "승인", reg: "2024-03-15", upd: "2026-05-01" },
  { code: "P-RMC-270", name: "레미콘 25-27-150", cls: "완제품", uom: "m³", status: "승인", reg: "2024-03-15", upd: "2026-05-01" },
  { code: "P-RMC-300", name: "레미콘 25-30-150", cls: "완제품", uom: "m³", status: "초안", reg: "2026-05-20", upd: "2026-05-22" },
];

const STATUS_BADGE: Record<Row["status"], string> = {
  승인: "b-approve",
  검토대기: "b-warn",
  초안: "b-draft",
  반려: "b-error",
};

export function ListPage() {
  const [rows] = useState<Row[]>(DEMO_ROWS);

  const columnDefs = useMemo(
    () => [
      {
        field: "code" as const,
        headerName: "품목코드",
        width: 130,
        pinned: "left" as const,
        cellClass: "cell-link",
        cellRenderer: (p: { value: string }) => (
          <a href="#" onClick={(e) => e.preventDefault()}>{p.value}</a>
        ),
      },
      { field: "name" as const, headerName: "품명", flex: 1, minWidth: 240 },
      { field: "cls" as const, headerName: "분류", width: 90 },
      { field: "uom" as const, headerName: "단위", width: 70 },
      {
        field: "status" as const,
        headerName: "상태",
        width: 110,
        cellRenderer: (p: { value: Row["status"] }) => (
          <span className={`badge ${STATUS_BADGE[p.value] ?? "b-draft"}`}>{p.value}</span>
        ),
      },
      { field: "reg" as const, headerName: "등록일", width: 110, cellClass: "cell-readonly num" },
      { field: "upd" as const, headerName: "최종수정", width: 110, cellClass: "cell-readonly num" },
    ],
    [],
  );

  return (
    <section className="page-card">
      <div className="page-h">
        <div>
          <h1>
            품목마스터 ▸ 목록
          </h1>
        </div>
        <div className="actions">
          <button className="btn-sec">엑셀 다운로드</button>
          <button className="btn-pri">+ 신규 등록</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="kpi accent">
          <div className="label">활성 품목</div>
          <div className="val">29,977</div>
          <div className="delta text-gray-500">전월 +436</div>
        </div>
        <div className="kpi">
          <div className="label">법인 수</div>
          <div className="val">14</div>
        </div>
        <div className="kpi">
          <div className="label">검토 대기</div>
          <div className="val">0</div>
        </div>
        <div className="kpi">
          <div className="label">소분류</div>
          <div className="val">652</div>
        </div>
      </div>

      <div className="filter-card">
        <div>
          <label>분류</label>
          <select>
            <option>전체</option>
            <option>원재료</option>
            <option>반제품</option>
            <option>완제품</option>
          </select>
        </div>
        <div>
          <label>등록일 (이후)</label>
          <input type="date" />
        </div>
        <div>
          <label>검색어</label>
          <input type="text" placeholder="품목코드 / 품명" />
        </div>
        <span className="chip">활성 필터 0</span>
        <button className="btn-sec">초기화</button>
        <button className="btn-pri" style={{ marginLeft: "auto" }}>조회</button>
      </div>

      <div className="section-title">품목 목록</div>
      <div className="ag-theme-quartz" style={{ height: 420 }}>
        <AgGridReact
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          rowHeight={34}
          headerHeight={30}
        />
      </div>
    </section>
  );
}
