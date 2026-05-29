import { Link } from "react-router-dom";

export function ManualPage() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 220px", gap: 22, alignItems: "start" }}>

      {/* 좌측 TOC */}
      <nav
        className="manual-toc"
        style={{ position: "sticky", top: "calc(var(--header-h) + 18px)", alignSelf: "start", maxHeight: "calc(100vh - var(--header-h) - 36px)", overflowY: "auto" }}
      >
        <input
          type="search"
          placeholder="매뉴얼 검색…"
          style={{ width: "100%", boxSizing: "border-box", padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "var(--app-fs)", marginBottom: 14 }}
        />

        <div className="toc-group">
          <div className="toc-h">시작하기</div>
          <a href="#intro">소개</a>
          <a href="#first-login">최초 로그인</a>
          <a href="#nav-basics">화면 구성·이동</a>
          <a href="#font-size">글꼴 크기 조절</a>
        </div>

        <div className="toc-group">
          <div className="toc-h">품목 마스터</div>
          <a href="#item-overview">개요</a>
          <a href="#item-register" className="active">신규 등록</a>
          <a href="#item-register" className="depth-2">기본 정보 입력</a>
          <a href="#item-register" className="depth-2">필수 항목 체크</a>
          <a href="#item-register" className="depth-2">검토 요청</a>
          <a href="#item-edit">수정</a>
          <a href="#item-bulk">엑셀 일괄 업로드</a>
          <a href="#item-deactivate">비활성화·복원</a>
        </div>

        <div className="toc-group">
          <div className="toc-h">BOM 관리</div>
          <a href="#bom-overview">개요</a>
          <a href="#bom-create">BOM 작성</a>
          <a href="#bom-cost">원가 계산</a>
        </div>

        <div className="toc-group">
          <div className="toc-h">권한 (RBAC)</div>
          <a href="#rbac">9 role 매트릭스</a>
          <a href="#permission-req">권한 신청</a>
        </div>

        <div className="toc-group">
          <div className="toc-h">참고</div>
          <a href="#shortcuts">단축키</a>
          <a href="#troubleshooting">트러블슈팅</a>
          <a href="#changelog">변경 이력</a>
        </div>
      </nav>

      {/* 중앙 본문 */}
      <section className="page-card" style={{ marginBottom: 0 }}>

        <div className="breadcrumb">
          <Link to="/manual">매뉴얼</Link>
          <span className="sep">›</span>
          <a href="#item-overview">품목 마스터</a>
          <span className="sep">›</span>
          <span>신규 등록</span>
        </div>

        <div className="page-h" style={{ marginBottom: 8 }}>
          <div>
            <h1>품목 신규 등록 <span className="text-xs text-gray-500 font-normal ml-2">/ manual/item/register</span></h1>
            <div className="meta">최종 수정 2026-05-15 · 작성 PI팀 권익성 · 매뉴얼 v0.3</div>
          </div>
          <div className="actions">
            <button className="btn-sec" title="인쇄">🖨 인쇄</button>
            <button className="btn-sec" title="피드백 제출">💬 피드백</button>
          </div>
        </div>

        <div className="doc-prose">

          <h2 id="item-register-h">개요</h2>
          <p>품목 마스터에 신규 항목을 등록합니다. 등록된 품목은 즉시 BOM·발주·재고 시스템에 반영되므로 정확성이 매우 중요합니다.</p>

          <div className="callout info">
            <div className="ct-title">ℹ 권한</div>
            <p>품목 신규 등록은 <code>admin</code> · <code>ops_mgr</code> · <code>plant_mgr</code> 권한이 필요합니다. 권한이 없을 경우 <a href="#permission-req">권한 신청</a> 절차를 참고하세요.</p>
          </div>

          <h2 id="step-1">1단계 — 기본 정보 입력</h2>
          <p>품목 목록 화면에서 우측 상단 <kbd>+ 신규 등록</kbd> 버튼을 클릭하면 등록 화면이 열립니다.</p>
          <h3>1.1 필수 입력 항목</h3>
          <ul>
            <li><strong>품목코드</strong> — <code>M-XXX-NNN</code> 패턴. 자세한 규칙은 <a href="#item-code-rule">품목코드 규칙</a> 참조</li>
            <li><strong>품명</strong> — 한글 권장, 50자 이내</li>
            <li><strong>대분류</strong> — 원재료 / 반제품 / 완제품 중 택일</li>
            <li><strong>관리단위(UOM)</strong> — ton / kg / m³ / EA</li>
          </ul>

          <h3>1.2 권장 입력 항목</h3>
          <table>
            <thead>
              <tr><th>항목</th><th>설명</th><th>예시</th></tr>
            </thead>
            <tbody>
              <tr><td>영문명</td><td>해외 거래·문서용</td><td>Ordinary Portland Cement</td></tr>
              <tr><td>규격</td><td>KS·JIS 등 인증 규격</td><td>KS L 5201:2021</td></tr>
              <tr><td>밀도</td><td>g/cm³ 단위 — 환산 계산에 사용</td><td>3.15</td></tr>
              <tr><td>유통기한</td><td>일 단위</td><td>90</td></tr>
            </tbody>
          </table>

          <div className="callout warn">
            <div className="ct-title">⚠ 주의</div>
            <p>품목코드는 등록 후 변경 시 관련 BOM·재고의 키 갱신이 필요합니다. <strong>신중히 입력</strong>하세요.</p>
          </div>

          <h2 id="step-2">2단계 — 물성·관리 정보</h2>
          <p>물성 값은 BOM 의 원가·중량 계산에 직접 사용되므로 정확해야 합니다.</p>

          <div className="callout tip">
            <div className="ct-title">💡 팁</div>
            <p>비슷한 기존 품목이 있다면 상세 페이지에서 <kbd>복제</kbd> 버튼으로 시작하세요. 기본값이 자동 채워져 시간이 단축됩니다.</p>
          </div>

          <h2 id="step-3">3단계 — 검토 요청</h2>
          <p>모든 항목 입력 후 우측 하단 <kbd>검토 요청 후 저장</kbd> 버튼을 클릭합니다.</p>
          <ol>
            <li>품목이 <span className="badge b-submit">제출</span> 상태로 저장됩니다.</li>
            <li>해당 도메인 책임자 (시멘트 → 구매팀장 / 골재 → SM1) 에게 알림이 발송됩니다.</li>
            <li>책임자가 승인하면 <span className="badge b-approve">승인</span> → 전사 사용 가능.</li>
            <li>반려 시 <span className="badge b-error">반려</span> → 작성자에게 사유 통보.</li>
          </ol>

          <h3>3.1 검토 SLA</h3>
          <p>책임자는 영업일 기준 <strong>1일 내</strong> 검토 완료. 미처리 시 자동 escalation.</p>

          <h2 id="step-4">4단계 — 등록 완료 후</h2>
          <p>승인된 품목은 약 5분 내 전사 시스템(BOM·발주·재고)에 동기화됩니다. 동기화 상태는 우상단 <code>30s</code> 표시(LIVE)로 확인 가능합니다.</p>

          <h2 id="faq">자주 묻는 질문</h2>
          <h3>Q. 임시 저장한 품목은 어디서 찾나요?</h3>
          <p>품목 목록의 상단 탭 <strong>내 초안</strong> 에서 확인 가능합니다. 14일간 보관 후 자동 삭제됩니다.</p>

          <h3>Q. 검토 요청 후 수정하고 싶어요</h3>
          <p>검토 시작 전이면 작성자가 회수 가능. 검토 시작 후엔 책임자에게 반려 요청.</p>

          <div className="callout danger">
            <div className="ct-title">⚠ 절대 하지 말 것</div>
            <p>승인된 품목의 단가를 사유 없이 변경하지 마세요. 모든 단가 변경은 감사 로그에 기록되며 분기 감사 대상입니다.</p>
          </div>

          <h2 id="related">관련 문서</h2>
          <ul>
            <li><a href="#">품목코드 규칙 v1.2</a></li>
            <li><a href="#">BOM 작성 가이드</a></li>
            <li><Link to="/qna">관련 Q&amp;A (12건)</Link></li>
          </ul>

          <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--c-border)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--app-fs-sm)", color: "var(--c-text-sub)" }}>
            <div><a href="#" style={{ color: "var(--c-accent-500)" }}>← 이전: 개요</a></div>
            <div>도움이 되었나요? &nbsp;
              <button className="btn-ghost" style={{ padding: "4px 10px" }}>👍 예 (24)</button>
              <button className="btn-ghost" style={{ padding: "4px 10px" }}>👎 아니오 (1)</button>
            </div>
            <div><a href="#" style={{ color: "var(--c-accent-500)" }}>다음: 수정 →</a></div>
          </div>
        </div>
      </section>

      {/* 우측 anchor */}
      <nav className="manual-anchors">
        <div className="ma-title">이 페이지</div>
        <a href="#item-register-h">개요</a>
        <a href="#step-1" className="active">1단계 — 기본 정보</a>
        <a href="#step-1" className="depth-2">필수 입력 항목</a>
        <a href="#step-1" className="depth-2">권장 입력 항목</a>
        <a href="#step-2">2단계 — 물성·관리</a>
        <a href="#step-3">3단계 — 검토 요청</a>
        <a href="#step-3" className="depth-2">검토 SLA</a>
        <a href="#step-4">4단계 — 등록 완료 후</a>
        <a href="#faq">자주 묻는 질문</a>
        <a href="#related">관련 문서</a>
      </nav>

    </div>
  );
}
