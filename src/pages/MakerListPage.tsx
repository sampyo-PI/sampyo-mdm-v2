import { useCallback, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef, type GridReadyEvent, type ICellRendererParams } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

type Maker = { code: string; name: string; description: string; usage: number; is_active: boolean; aliases?: string[] };

const MAKERS: Maker[] = [
  { code: "SKF", name: "SKF", description: "스웨덴 베어링 제조사", usage: 1842, is_active: true, aliases: ["에스케이에프"] },
  { code: "NSK", name: "NSK", description: "일본 베어링 제조사", usage: 1521, is_active: true },
  { code: "FAG", name: "FAG", description: "독일 베어링 제조사", usage: 987, is_active: true },
  { code: "MITSUBISHI", name: "Mitsubishi", description: "미쓰비시 (모터·전기)", usage: 842, is_active: true, aliases: ["미쓰비시", "Mits"] },
  { code: "ABB", name: "ABB", description: "ABB Group (모터·드라이브)", usage: 754, is_active: true },
  { code: "SIEMENS", name: "Siemens", description: "지멘스 (자동화·전기)", usage: 642, is_active: true, aliases: ["지멘스"] },
  { code: "PARKER", name: "Parker", description: "파커 (유압·공압)", usage: 487, is_active: true },
  { code: "HYUNDAI", name: "현대중공업", description: "현대중공업", usage: 421, is_active: true },
  { code: "DOOSAN", name: "두산", description: "두산공작기계·중공업", usage: 398, is_active: true },
  { code: "KOMATSU", name: "Komatsu", description: "고마쓰 (중장비)", usage: 354, is_active: true },
  { code: "CAT", name: "Caterpillar", description: "캐터필러", usage: 312, is_active: true },
  { code: "VOLVO", name: "Volvo", description: "볼보 (트럭·중장비)", usage: 287, is_active: true },
  { code: "BOSCH", name: "Bosch", description: "보쉬 (전동공구·센서)", usage: 245, is_active: true, aliases: ["보쉬"] },
  { code: "OMRON", name: "Omron", description: "오므론 (센서·제어)", usage: 198, is_active: true },
  { code: "DANFOSS", name: "Danfoss", description: "단포스 (밸브·드라이브)", usage: 142, is_active: true },
  { code: "FESTO", name: "Festo", description: "페스토 (공압)", usage: 121, is_active: true },
  { code: "FANUC", name: "Fanuc", description: "FANUC (CNC·로봇)", usage: 98, is_active: true },
  { code: "EATON", name: "Eaton", description: "이튼 (전기·유압)", usage: 87, is_active: true },
  { code: "SCHNEIDER", name: "Schneider", description: "슈나이더 일렉트릭", usage: 64, is_active: true },
  { code: "REXROTH", name: "Rexroth", description: "보쉬 렉스로스", usage: 32, is_active: false },
];

const CodeChip = ({ value }: { value: string }) => <span className="maker-code">{value}</span>;
const AliasCell = ({ aliases }: { aliases: string[] | undefined }) => {
  if (!aliases || aliases.length === 0) return <span style={{ color: "#cbd5e1" }}>—</span>;
  return <>{aliases.map((a, i) => <span key={i} className="alias-chip">{a}</span>)}</>;
};
const UsageCell = ({ value }: { value: number }) => {
  const pct = Math.min(100, Math.round((value / 1900) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span className="t-mono t-meta" style={{ minWidth: 48 }}>{value.toLocaleString()}</span>
      <div className="usage-bar"><div className="fill" style={{ width: `${pct}%` }}></div></div>
    </div>
  );
};
const StatusBadge = ({ on }: { on: boolean }) => <span className={`badge-status ${on ? "active" : "inactive"}`}>{on ? "사용" : "미사용"}</span>;

type MergeState = "off" | "on";

export function MakerListPage() {
  const [search, setSearch] = useState("");
  const [mergeMode, setMergeMode] = useState<MergeState>("off");
  const [selected, setSelected] = useState<string[]>([]);

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
    { headerName: "제조사명", field: "name", width: 160, cellStyle: { fontWeight: 600 } as any },
    { headerName: "별칭 (aliases)", field: "aliases", width: 200, cellRenderer: (p: ICellRendererParams<Maker>) => <AliasCell aliases={p.value} />, filterValueGetter: (p) => (p.data?.aliases || []).join(", "), sortable: false },
    { headerName: "사용 빈도 (items)", field: "usage", width: 200, cellRenderer: (p: ICellRendererParams<Maker>) => <UsageCell value={p.value} />, sort: "desc" },
    { headerName: "상태", field: "is_active", width: 80, cellRenderer: (p: ICellRendererParams<Maker>) => <StatusBadge on={p.value} />, filterValueGetter: (p) => p.data?.is_active ? "사용" : "미사용" },
    { headerName: "설명", field: "description", width: 260, cellStyle: { color: "#64748b", fontSize: "13px" } as any },
    { headerName: mergeMode === "on" ? "선택" : "관리", width: 90, cellRenderer: (p: ICellRendererParams<Maker>) => <ActionsCell data={p.data!} />, sortable: false, filter: false, cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } as any },
  ]), [mergeMode, selected]);

  const onGridReady = useCallback((e: GridReadyEvent) => e.api.sizeColumnsToFit(), []);

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>제조사 리스트<span className="text-xs text-gray-500 font-normal ml-2">/ maker-model</span></h1>
          <div className="meta">1,743개 제조사 마스터 · items.maker 매칭 (free-text)</div>
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
        <div className="stat-card"><div className="stat-label">전체 제조사</div><div className="stat-val">1,743</div><div className="stat-sub">사용 중 1,498 · 미사용 245</div></div>
        <div className="stat-card"><div className="stat-label">items 매칭률</div><div className="stat-val">87%</div><div className="stat-sub">26,080 / 29,977</div></div>
        <div className="stat-card"><div className="stat-label">별칭 등록</div><div className="stat-val">312</div><div className="stat-sub">한글/영문/약어 다국어</div></div>
        <div className="stat-card"><div className="stat-label">중복 후보</div><div className="stat-val" style={{ color: "#b45309" }}>23</div><div className="stat-sub">병합 검토 필요</div></div>
      </div>

      {mergeMode === "on" && (
        <div className="callout-merge">
          🔗 <strong>병합 모드</strong> — 같은 제조사로 묶을 행 2개 이상 선택 후 "병합 실행". 첫 선택이 base, 나머지는 alias로 흡수됩니다.
        </div>
      )}

      <div className="maker-toolbar">
        <div className="search-box">
          <svg className="ic-search" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="제조사명 · 코드 · 별칭 검색…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="t-meta">전체 <strong className="t-navy">1,743개</strong> (목업 20행 표시)</span>
      </div>

      <div className="ag-theme-quartz" style={{ height: 540 }}>
        <AgGridReact<Maker>
          rowData={MAKERS}
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
