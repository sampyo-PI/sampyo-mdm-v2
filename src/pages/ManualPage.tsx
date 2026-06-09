import { Link } from "react-router-dom";

export function ManualPage() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 22, alignItems: "start" }}>

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
          <a href="#login">로그인·권한</a>
          <a href="#layout">화면 구성</a>
          <a href="#fontsize">글꼴 크기</a>
        </div>

        <div className="toc-group">
          <div className="toc-h">품목 신규 등록</div>
          <a href="#reg-flow">등록 흐름</a>
          <a href="#reg-classify" className="depth-2">1. 분류 선택</a>
          <a href="#reg-input" className="depth-2">2. 정보·속성 입력</a>
          <a href="#reg-ai" className="depth-2">3. AI 분석·중복검사</a>
          <a href="#reg-submit" className="depth-2">4. 제출·임시저장</a>
          <a href="#variant">변형 품목 등록</a>
        </div>

        <div className="toc-group">
          <div className="toc-h">검토·승인</div>
          <a href="#ai-review">AI 1차 검토</a>
          <a href="#review-3step">3단계 검토</a>
          <a href="#status">상태 흐름</a>
        </div>

        <div className="toc-group">
          <div className="toc-h">코드·표준명</div>
          <a href="#code-rule">품목코드 규칙</a>
          <a href="#normalized">표준명(품명 자동조합)</a>
        </div>

        <div className="toc-group">
          <div className="toc-h">카탈로그·분류</div>
          <a href="#catalog">카탈로그·법인 배포</a>
          <a href="#classification">분류·속성 체계</a>
        </div>

        <div className="toc-group">
          <div className="toc-h">참고</div>
          <a href="#rbac">권한(RBAC)</a>
          <a href="#qna">개선요청(Q&A)</a>
          <a href="#troubleshooting">트러블슈팅</a>
          <a href="#changelog">변경 이력</a>
        </div>
      </nav>

      {/* 중앙 본문 */}
      <section className="page-card" style={{ marginBottom: 0 }}>

        <div className="breadcrumb">
          <Link to="/manual">매뉴얼</Link>
          <span className="sep">›</span>
          <span>삼표 품목코드 시스템 사용 안내</span>
        </div>

        <div className="page-h" style={{ marginBottom: 8 }}>
          <div>
            <h1>삼표 품목코드 시스템(MDM) 매뉴얼</h1>
          </div>
          <div className="actions">
            <button className="btn-sec" title="인쇄">🖨 인쇄</button>
            <Link to="/qna" className="btn-sec" title="질문하기">💬 Q&amp;A</Link>
          </div>
        </div>

        <div className="doc-prose">

          {/* 시작하기 */}
          <h2 id="intro">소개</h2>
          <p>삼표 MDM은 14개 법인이 공유하는 <strong>품목 마스터(자재 코드)를 표준화</strong>하는 시스템입니다. 사용자가 신규 품목을 신청하면 <strong>AI 1차 검토 → 사람 3단계 검토</strong>를 거쳐 승인되고, 승인된 품목은 12자리 표준 코드가 발급되어 <strong>ERP로 자동 전송</strong>됩니다.</p>
          <div className="callout info">
            <div className="ct-title">ℹ 표준화 범위</div>
            <p>현재 표준화 대상은 <strong>저장품 · 연료/유지류</strong> 중심입니다. 신규 등록은 본 시스템에서, 기존 품목 정리는 카탈로그에서 진행합니다.</p>
          </div>

          <h2 id="login">로그인·권한</h2>
          <ul>
            <li><strong>로그인</strong> — 회사 Google 계정(<code>@sampyo.co.kr</code> / <code>@sampyoenc.com</code>)으로 접속합니다.</li>
            <li><strong>최초 로그인</strong> — 사전 등록된 권한이 자동 부여됩니다. 권한이 없으면 관리자에게 요청하세요.</li>
            <li>역할은 <a href="#rbac">권한(RBAC)</a> 섹션 참고 — 신청(user) / 검토·승인(reviewer) / 관리(admin).</li>
          </ul>

          <h2 id="layout">화면 구성</h2>
          <p>좌측 <strong>사이드바</strong>로 메뉴를 이동합니다: 대시보드 · 품목등록 · 품목마스터(카탈로그) · 분류관리 · 속성마스터 · 제조사관리 · AI 관리 · 시스템관리 · 개선요청(Q&amp;A). 관리자 전용 메뉴(시스템관리·AI 관리 등)는 일반 사용자에게 보이지 않습니다.</p>

          <h2 id="fontsize">글꼴 크기</h2>
          <p>상단 헤더의 <kbd>A−</kbd> <kbd>A</kbd> <kbd>A+</kbd> <kbd>A++</kbd> 버튼으로 전체 화면 글꼴 크기를 조절할 수 있습니다. 설정은 자동 저장됩니다.</p>

          {/* 신규 등록 */}
          <h2 id="reg-flow">품목 신규 등록 흐름</h2>
          <p>사이드바 <strong>품목등록 › 신규 등록</strong>에서 진행합니다. 순서는 다음과 같습니다.</p>

          <h3 id="reg-classify">1. 분류 선택 (필수)</h3>
          <p><strong>대분류 → 중분류 → 소분류</strong>를 순서대로 선택합니다. 소분류가 품목코드와 속성 구성을 결정하므로 반드시 끝까지 선택해야 합니다.</p>

          <h3 id="reg-input">2. 정보·속성 입력</h3>
          <ul>
            <li><strong>품명·규격</strong> — 신청 품목명과 규격</li>
            <li><strong>제조사·모델</strong> — 구매품의 경우 입력 권장 (중복 식별에 사용)</li>
            <li><strong>속성</strong> — 소분류에 매핑된 속성 값 (입력 시 기존 값 자동완성 제공)</li>
            <li><strong>첨부</strong> — 도면·사진·문서 첨부 가능</li>
          </ul>

          <h3 id="reg-ai">3. AI 분석·중복검사</h3>
          <p>입력 내용을 바탕으로 AI가 <strong>분류 추천 · 표준명 생성 · 중복 위험도</strong>를 분석합니다. 제출 시 시스템이 자동으로 중복을 검사합니다.</p>
          <div className="callout warn">
            <div className="ct-title">⚠ 중복 차단</div>
            <p>같은 소분류에 <strong>표준명이 동일</strong>한 품목이 있으면 등록이 차단됩니다. 제조사만 다른 경우 <strong>변형 품목</strong>으로 등록하도록 안내됩니다. (<a href="#normalized">표준명</a> 참고)</p>
          </div>

          <h3 id="reg-submit">4. 제출·임시저장</h3>
          <ol>
            <li><kbd>임시저장</kbd> 시 <span className="badge b-warn">DRAFT</span> 상태로 보관되어 나중에 이어쓸 수 있습니다.</li>
            <li><kbd>제출</kbd> 시 요청번호(<code>R + YYMMDD + 순번</code>, 예 <code>R2606050001</code>)가 발급되고 검토 절차가 시작됩니다.</li>
          </ol>

          <h2 id="variant">변형 품목 등록</h2>
          <p>기존 품목과 규격·속성이 같고 일부만 다른 경우, 카탈로그 상세에서 <strong>변형 등록</strong>으로 진행합니다. 변형은 기본형(<code>00</code>) 뒤에 <code>01</code>, <code>02</code>… 순으로 코드가 부여됩니다.</p>

          {/* 검토 승인 */}
          <h2 id="ai-review">AI 1차 검토</h2>
          <p>제출 즉시 AI가 1차 검토를 수행합니다(정식 가동 중). 결과에 따라 자동으로 다음 중 하나로 분기합니다.</p>
          <ul>
            <li><strong>통과</strong> → 사람 2차 검토 대기로 이동</li>
            <li><strong>반려</strong> → <span className="badge b-error">반려</span> (사유 통보)</li>
            <li><strong>보완 요청</strong> → 신청자에게 반환(분류·속성 보완 필요)</li>
            <li><strong>수동 검토</strong> → 판단 보류 시 사람 검토로 위임</li>
          </ul>

          <h2 id="review-3step">3단계 검토</h2>
          <p>품목은 최대 3단계(1차 → 2차 → 3차) 사람 검토를 거칩니다. 검토자는 <strong>회사·계열별로 지정</strong>되며, 각 단계에서 승인 / 반려 / 보완 요청을 할 수 있습니다.</p>
          <p>최종 승인되면 <strong>12자리 품목코드</strong>가 발급되고, 카탈로그 등록과 <strong>ERP 전송 큐</strong>가 자동 생성됩니다.</p>

          <h2 id="status">상태 흐름</h2>
          <table>
            <thead><tr><th>상태</th><th>의미</th></tr></thead>
            <tbody>
              <tr><td><span className="badge b-warn">DRAFT</span></td><td>임시저장 (제출 전)</td></tr>
              <tr><td>PENDING_REVIEW_1~3</td><td>1·2·3차 검토 대기</td></tr>
              <tr><td>AI 보완요청 / 수동검토</td><td>신청자 보완 또는 사람 수동 검토 대기</td></tr>
              <tr><td><span className="badge b-approve">APPROVED</span></td><td>승인 — 코드 발급·ERP 전송</td></tr>
              <tr><td><span className="badge b-error">REJECTED</span></td><td>반려 — 사유 통보</td></tr>
            </tbody>
          </table>

          {/* 코드 표준명 */}
          <h2 id="code-rule">품목코드 규칙</h2>
          <p>품목코드는 <strong>12자리</strong>이며 의미 단위로 구성됩니다.</p>
          <table>
            <thead><tr><th>구간</th><th>자리수</th><th>설명</th></tr></thead>
            <tbody>
              <tr><td>대분류</td><td>1</td><td>예: M(기계부속)</td></tr>
              <tr><td>중분류</td><td>2</td><td>예: LN</td></tr>
              <tr><td>소분류</td><td>3</td><td>예: CAB</td></tr>
              <tr><td>일련번호</td><td>4</td><td>예: 0001</td></tr>
              <tr><td>변형</td><td>2</td><td>기본형 00, 변형 01·02…</td></tr>
            </tbody>
          </table>
          <p>화면 표기는 가독성을 위해 5구간을 하이픈으로 구분합니다: <code>M-LN-CAB-0001-00</code> (DB 저장은 연속 12자).</p>

          <h2 id="normalized">표준명 (품명 자동조합)</h2>
          <p>표준명은 <strong>소분류명 + 이름에 포함하도록 지정된 속성값</strong>을 순서대로 자동 조합한 이름입니다. 예: <code>주조강구 직경30 경도90</code>.</p>
          <div className="callout tip">
            <div className="ct-title">💡 왜 중요한가</div>
            <p>사람마다 다르게 적는 품명과 무관하게 <strong>같은 물건은 항상 같은 표준명</strong>이 되도록 합니다. 이 표준명이 <strong>중복 방지 키</strong>이자 <strong>ERP 전송 품명</strong>으로 쓰입니다.</p>
          </div>

          {/* 카탈로그 분류 */}
          <h2 id="catalog">카탈로그 · 법인 배포</h2>
          <p>사이드바 <strong>품목마스터 › 품목 카탈로그</strong>에서 전체 활성 품목을 대/중/소분류 필터와 검색으로 조회합니다. 상세 화면에서 속성·제조사·<strong>법인 배포 현황</strong>을 확인하고, 편집·변형 등록·사용 중지(REVOKE)를 할 수 있습니다.</p>
          <p>하나의 품목을 여러 법인(최대 14개)이 공유할 수 있으며, 법인에 배포하면 해당 법인의 ERP로 전송됩니다.</p>

          <h2 id="classification">분류·속성 체계</h2>
          <p>분류는 <strong>대 16 / 중 138 / 소 652</strong>로 구성됩니다. 소분류마다 <strong>분류-속성 매핑</strong>으로 입력 속성이 정의되며, 이 중 일부 속성이 표준명에 포함됩니다. 속성·단위·제조사 마스터는 관리자가 관리합니다.</p>

          {/* 참고 */}
          <h2 id="rbac">권한 (RBAC)</h2>
          <table>
            <thead><tr><th>역할</th><th>할 수 있는 일</th></tr></thead>
            <tbody>
              <tr><td><strong>user</strong></td><td>품목 신규 신청, 본인 요청·카탈로그 조회</td></tr>
              <tr><td><strong>reviewer</strong></td><td>지정 회사·계열의 품목 검토·승인/반려</td></tr>
              <tr><td><strong>admin</strong></td><td>전체 + 분류·속성·제조사·사용자 등 마스터 관리</td></tr>
            </tbody>
          </table>

          <h2 id="qna">개선요청 (Q&amp;A)</h2>
          <p>사이드바 <strong>개선요청(Q&amp;A)</strong>에서 버그·개선요청·질문을 등록하고 댓글로 소통합니다. 처리되면 글이 <span className="badge b-approve">종료</span> 상태가 됩니다. → <Link to="/qna">Q&amp;A 바로가기</Link></p>

          <h2 id="troubleshooting">트러블슈팅</h2>
          <ul>
            <li><strong>화면이 갱신되지 않을 때</strong> — <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> (강력 새로고침)으로 캐시를 비웁니다.</li>
            <li><strong>메뉴가 보이지 않을 때</strong> — 권한에 따라 일부 메뉴가 숨겨집니다(관리자 전용). 관리자에게 문의하세요.</li>
            <li><strong>중복으로 차단될 때</strong> — 같은 표준명 품목이 이미 있는 경우입니다. 제조사가 다르면 변형 등록으로 진행하세요.</li>
          </ul>

          <h2 id="changelog">변경 이력</h2>
          <ul>
            <li><strong>v1.0 (2026-06-05)</strong> — 실제 MDM 시스템 기준 전면 작성 (12자리 코드 · AI 1차+3단계 검토 · 표준명 · 법인 배포)</li>
          </ul>

          <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--c-border)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--app-fs-sm)", color: "var(--c-text-sub)" }}>
            <div>문의·개선 제안은 <Link to="/qna" style={{ color: "var(--c-accent-500)" }}>개선요청(Q&amp;A)</Link>으로</div>
            <div>도움이 되었나요? &nbsp;
              <button className="btn-ghost" style={{ padding: "4px 10px" }}>👍 예</button>
              <button className="btn-ghost" style={{ padding: "4px 10px" }}>👎 아니오</button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
