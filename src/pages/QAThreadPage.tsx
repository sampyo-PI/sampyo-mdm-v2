import { useParams, Link } from "react-router-dom";

export function QAThreadPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <section className="page-card">

      <div className="breadcrumb">
        <Link to="/qna">Q&amp;A 게시판</Link>
        <span className="sep">›</span>
        <span>품목등록</span>
        <span className="sep">›</span>
        <span>#{id ?? "1247"}</span>
      </div>

      {/* 질문 */}
      <article className="qa-question">
        <div className="qq-body">
          <div className="qq-vote">
            <button title="추천">▲</button>
            <span className="v">12</span>
            <button title="비추천">▼</button>
            <div style={{ marginTop: 8, color: "#94a3b8", fontSize: "var(--app-fs-xs)" }} title="북마크">★ 4</div>
          </div>
          <div className="qq-content">
            <h2>품목코드 규칙 — 시멘트류 신규 등록 시 prefix 변경 가능한가요?</h2>
            <div className="qq-meta">
              <span>👁 조회 246</span>
              <span>💬 댓글 5</span>
              <span>· 작성 2026-05-19</span>
              <span>· 최종 활동 3시간 전</span>
              <span className="badge b-approve">채택됨</span>
            </div>

            <div className="doc-prose">
              <p>현재 시멘트류 품목코드 규칙이 <code>M-OPC-XXX</code> / <code>M-FA-XXX</code> 로 굳어져 있는데, 안양·당진 사업소에서 별도 prefix(예: <code>AY-M-OPC-XXX</code>) 가 필요한 상황이 발생했습니다.</p>
              <p>다음 두 가지 확인 부탁드립니다:</p>
              <ol>
                <li>품목코드 규칙 v1.2 문서의 표준 위반 없이 사업소별 prefix 가능한지</li>
                <li>가능하다면 신규 등록 시 어떤 절차로 진행해야 하는지 (admin 권한 필요? PR? 자동 채번?)</li>
              </ol>
              <p>BOM 1,247건과 연결돼 있어 신중히 처리하고 싶습니다.</p>

              <div className="callout warn">
                <div className="ct-title">⚠ 시급도</div>
                <p>2026-Q2 안양 신규 capa 증설 일정과 맞물려 5/30 전 결론 필요.</p>
              </div>
            </div>

            <div className="qq-tags">
              {["품목등록", "규칙", "prefix", "사업소"].map((t) => (
                <span key={t} className="qa-tag">{t}</span>
              ))}
            </div>

            <div className="qq-author-card">
              <div className="avatar">박</div>
              <div>
                <div className="label">질문자 · 2026-05-19 14:22</div>
                <div className="name">박정민 · 구매팀</div>
              </div>
            </div>

            <div className="qa-comments">
              <div className="qa-comment">
                <span className="c-author">김상동</span>
                관련 회의록(2026-04-22)에서 한 번 다뤄진 적 있는 것 같습니다. 확인해보겠습니다.
                <span className="c-time">2026-05-19 16:08</span>
              </div>
              <div className="qa-comment">
                <span className="c-author">권익성</span>
                품목코드 규칙 변경은 거버넌스 차원이라 PI팀 검토 필요합니다. 답변 드리겠습니다.
                <span className="c-time">2026-05-19 17:30</span>
              </div>
              <div className="qa-comment">
                <span className="c-add">+ 댓글 추가</span>
              </div>
            </div>
          </div>
        </div>
      </article>

      <div className="qa-answers-h">답변 3개 — 채택 ✓ 1</div>

      {/* 채택된 답변 */}
      <article className="qa-answer accepted">
        <div className="qa-accepted-badge">✓ 채택됨</div>
        <div className="qa-body">
          <div className="qa-vote">
            <button title="추천">▲</button>
            <span className="v">28</span>
            <button title="비추천">▼</button>
          </div>
          <div className="qa-content">
            <div className="doc-prose">
              <p>결론부터 답변드리면 <strong>가능합니다.</strong> 단, 다음 3가지 조건이 충족돼야 합니다.</p>
              <h3>1. 사업소 prefix 등록 절차</h3>
              <ol>
                <li>admin 권한으로 <code>/admin/site-prefix</code> 페이지에서 사업소 prefix 등록 (예: <code>AY</code> = 안양)</li>
                <li>해당 사업소에서만 사용하는 품목으로 표시 (전사 공통은 기존 규칙 유지)</li>
                <li>BOM 영향도 자동 분석 후 PR — 거버넌스 위반 시 알림</li>
              </ol>
              <h3>2. 표준 위반 여부</h3>
              <p>품목코드 규칙 v1.2 §3.2 에 "사업소 prefix 는 표준 prefix 앞에 추가 가능" 명시. 위반 아닙니다.</p>
              <h3>3. 진행 권장</h3>
              <p>5/30 전 결론 필요하다면 다음 절차로:</p>
              <ul>
                <li>5/24 (월) 권한 신청 → admin 발급</li>
                <li>5/27 (목) prefix 등록 + 테스트 (sandbox)</li>
                <li>5/29 (토) 운영 반영 + BOM 1,247건 자동 마이그레이션</li>
              </ul>
              <div className="callout info">
                <div className="ct-title">ℹ 참고 문서</div>
                <p><Link to="/manual">품목코드 규칙 v1.2 §3.2 사업소 prefix</Link> · <a href="#">자동 마이그레이션 가이드</a></p>
              </div>
            </div>

            <div className="qa-author-card">
              <div className="avatar">권</div>
              <div>
                <div className="label">답변자 · 2026-05-20 09:15</div>
                <div className="name">권익성 · 전략기획 (PI팀장)</div>
              </div>
            </div>

            <div className="qa-comments">
              <div className="qa-comment">
                <span className="c-author">박정민</span>
                답변 감사합니다. 권한 신청 바로 진행하겠습니다.
                <span className="c-time">2026-05-20 09:42</span>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* 일반 답변 */}
      <article className="qa-answer">
        <div className="qa-body">
          <div className="qa-vote">
            <button title="추천">▲</button>
            <span className="v">8</span>
            <button title="비추천">▼</button>
          </div>
          <div className="qa-content">
            <div className="doc-prose">
              <p>참고로, BOM 마이그레이션 시 자동 매핑 스크립트는 <code>scripts/migrate_prefix.py</code> 입니다. dry-run 옵션으로 영향도 미리 확인 가능합니다.</p>
              <pre><code>{`python3 scripts/migrate_prefix.py \\
  --site AY \\
  --pattern "M-OPC-*" \\
  --dry-run`}</code></pre>
              <p>실 마이그레이션 전 dry-run 결과를 PI팀에 공유해주시면 좋습니다.</p>
            </div>
            <div className="qa-author-card">
              <div className="avatar">김</div>
              <div>
                <div className="label">답변자 · 2026-05-20 11:08</div>
                <div className="name">김상동 · SM1팀</div>
              </div>
            </div>
          </div>
        </div>
      </article>

      <article className="qa-answer">
        <div className="qa-body">
          <div className="qa-vote">
            <button title="추천">▲</button>
            <span className="v">3</span>
            <button title="비추천">▼</button>
          </div>
          <div className="qa-content">
            <div className="doc-prose">
              <p>당진 사업소도 동일한 요구가 있었습니다. 안양 ↔ 당진 둘 다 진행한다면 같은 PR 로 처리하면 효율적입니다.</p>
            </div>
            <div className="qa-author-card">
              <div className="avatar">이</div>
              <div>
                <div className="label">답변자 · 2026-05-20 14:30</div>
                <div className="name">이수영 · 품질팀</div>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* 답변 작성 */}
      <div className="qa-write">
        <h3>답변 작성</h3>
        <textarea placeholder="명확하고 구체적인 답변을 작성하세요. 마크다운·코드 블록·이미지 첨부 지원." />
        <div className="qw-foot">
          <span className="qw-hint">마크다운 지원 · 첨부 5MB 이하 · 답변 작성 후 30분 내 수정 가능</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-sec">미리보기</button>
            <button className="btn-pri">답변 등록</button>
          </div>
        </div>
      </div>

    </section>
  );
}
