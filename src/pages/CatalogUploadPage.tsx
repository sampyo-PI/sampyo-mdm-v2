import { useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const COLUMN_MAP: [string, string][] = [
  ["표준코드_12자리", "item_code (비어있으면 업로드 시 자동 채번)"],
  ["품목명", "item_name (필수)"],
  ["사용법인", "company"],
  ["품목코드", "legacy_code (기존코드)"],
  ["규격", "spec"],
  ["대분류 / 중분류 / 소분류", "large/medium/small_category"],
  ["제조사 / 모델명", "maker / model"],
  ["적용설비", "equipment"],
  ["속성1~5 + 속성1_value~5_value", "attributes (JSONB 배열) ※ 5→N 확장 예정"],
  ["표준명", "normalized_name (없으면 NULL)"],
  ["일련번호 / 제조사구분", "serial_number / maker_suffix"],
  ["표준코드_표기", "item_code_display (없으면 채번 시 X-XX-XXX-XXXX-XX 자동 포맷)"],
  ["품목계정 / 품목계정명", "item_account_code/_name (입력 시 자동 lookup 무시)"],
  ["품목클래스 / 품목클래스명", "item_class_code/_name (입력 시 자동 lookup 무시)"],
  ["재고단위", "stock_unit_code (입력 시 자동 lookup 무시)"],
];

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function CatalogUploadPage() {
  const { isAdmin } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);

  const pickFile = (f: File) => setFile({ name: f.name, size: f.size });

  if (!isAdmin) {
    return (
      <section className="page-card">
        <style>{PAGE_STYLES}</style>
        <div className="page-h">
          <div>
            <h1>
              데이터 업로드
              <span className="text-xs text-gray-500 font-normal ml-2">/ catalog/upload</span>
            </h1>
            <div className="meta">관리자 전용 페이지</div>
          </div>
        </div>
        <div className="callout danger">
          <div className="ct-title">접근 권한 없음</div>
          <p>이 페이지는 관리자(admin)만 볼 수 있습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-card">
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>
            데이터 업로드 <span className="t-badge">관리자용</span>
            <span className="text-xs text-gray-500 font-normal ml-2">/ catalog/upload</span>
          </h1>
          <div className="meta">Excel(.xlsx) 파일로 품목 카탈로그를 일괄 등록 — 표준코드 기준 upsert</div>
        </div>
      </div>

      <div className="callout warn">
        <div className="ct-title">⏳ 업로드 기능 준비 중</div>
        <p>
          전수 <strong>재분류 changeset</strong> 작업이 진행 중이며 업로드 컬럼 포맷(속성 5→N 확장)이 변경될 수
          있어, v2 업로드 commit은 <strong>비활성</strong> 상태입니다. 현재는 화면·컬럼 매핑만 확인하고, 실
          적재는 v1(운영) 화면에서 수행하세요.
        </p>
      </div>

      {!file ? (
        <div
          className="dropzone"
          onClick={() => fileRef.current?.click()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) pickFile(f);
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="dz-ic">⬆</div>
          <div className="dz-title">파일을 드래그하거나 클릭하여 선택</div>
          <div className="dz-sub">.xlsx 파일 — Final_MDM_Perfect_V9.xlsx 형식</div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden-input"
            onChange={(e) => {
              if (e.target.files?.[0]) pickFile(e.target.files[0]);
            }}
          />
        </div>
      ) : (
        <div className="file-row">
          <div className="file-info">
            <span className="file-ic">📄</span>
            <div>
              <div className="file-name">{file.name}</div>
              <div className="file-size">{fmtSize(file.size)}</div>
            </div>
          </div>
          <button className="btn-ghost" onClick={() => setFile(null)}>
            ✕ 제거
          </button>
        </div>
      )}

      <div className="upload-cta">
        <button className="btn-pri" disabled title="재분류 작업 안정화 후 활성화 예정">
          업로드 시작 (비활성)
        </button>
        <span className="cta-note">현재 업로드는 비활성입니다.</span>
      </div>

      <div className="section-title">Excel 컬럼 매핑 안내</div>
      <div className="map-card">
        <div className="map-grid">
          {COLUMN_MAP.map(([excel, db]) => (
            <div key={excel} className="map-item">
              <span className="excel">{excel}</span>
              <span className="arrow">→</span>
              <span className="db">{db}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const PAGE_STYLES = `
.t-badge { display:inline-block; vertical-align:middle; margin-left:8px; padding:1px 8px; border-radius:9999px; background:#003876; color:#fff; font-size:11px; font-weight:600; }

.dropzone { border:2px dashed #cbd5e1; border-radius:12px; padding:48px 20px; text-align:center; cursor:pointer; transition:border-color 0.15s, background 0.15s; }
.dropzone:hover { border-color:#003876; background:#f8fafc; }
.dropzone .dz-ic { font-size:34px; color:#94a3b8; }
.dropzone .dz-title { font-weight:600; color:#1f2937; margin-top:8px; }
.dropzone .dz-sub { font-size:12px; color:#94a3b8; margin-top:4px; }
.hidden-input { display:none; }

.file-row { display:flex; align-items:center; justify-content:space-between; border:1px solid #e2e8f0; border-radius:10px; padding:14px 16px; background:#f8fafc; }
.file-info { display:flex; align-items:center; gap:12px; }
.file-info .file-ic { font-size:22px; }
.file-info .file-name { font-weight:600; color:#1f2937; }
.file-info .file-size { font-size:12px; color:#64748b; }

.upload-cta { display:flex; align-items:center; gap:12px; margin:16px 0 4px; }
.upload-cta .cta-note { font-size:12px; color:#94a3b8; }

.map-card { border:1px solid #e2e8f0; border-radius:10px; background:#fafbfc; padding:14px 16px; }
.map-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px 24px; }
.map-item { display:flex; gap:6px; align-items:baseline; font-size:12px; padding:2px 0; }
.map-item .excel { font-family:ui-monospace,monospace; color:#003876; font-weight:600; white-space:nowrap; }
.map-item .arrow { color:#cbd5e1; }
.map-item .db { color:#64748b; }
@media (max-width: 900px) { .map-grid { grid-template-columns:1fr; } }
`;
