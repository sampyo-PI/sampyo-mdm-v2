import { useState } from "react";
import { Link } from "react-router-dom";

type QATab = "all" | "pending" | "my" | "popular";

type QAItem = {
  id: string;
  state: "accepted" | "answered" | "pending";
  answerCount: number;
  title: string;
  snippet: string;
  tags: string[];
  views: number;
  comments: number;
  agoLabel: string;
  authorName: string;
  authorDept: string;
  date: string;
  warnBadge?: string;
};

const DUMMY_QA: QAItem[] = [
  {
    id: "1247",
    state: "accepted",
    answerCount: 3,
    title: "품목코드 규칙 — 시멘트류 신규 등록 시 prefix 변경 가능한가요?",
    snippet: "M-OPC-XXX 가 기존 규칙이지만 사업소별로 별도 prefix 가 필요한 경우 — 표준 위반 없이 가능한지 문의드립니다.",
    tags: ["품목등록", "규칙"],
    views: 246, comments: 5, agoLabel: "3일 전",
    authorName: "박정민", authorDept: "구매팀", date: "2026-05-19",
  },
  {
    id: "1246",
    state: "answered",
    answerCount: 2,
    title: "BOM 일괄 업로드 — 엑셀 양식 어디서 받나요?",
    snippet: "100개 단위 BOM 신규 등록인데 한 건씩 입력하기 비효율적입니다. 엑셀 일괄 업로드 양식 안내 부탁드립니다.",
    tags: ["BOM", "엑셀업로드"],
    views: 124, comments: 3, agoLabel: "5일 전",
    authorName: "김상동", authorDept: "SM1팀", date: "2026-05-17",
  },
  {
    id: "1245",
    state: "pending",
    answerCount: 0,
    title: "단가 변경 시 변경 사유 입력 — 필수 글자 수가 20자 미만 안 되는데 정확한 기준은?",
    snippet: "감사 로그에 남기 위해 최소 20자라고 안내문구는 보이는데 정확한 기준과 권장 양식이 있는지요.",
    tags: ["단가변경", "감사로그"],
    views: 18, comments: 0, agoLabel: "8시간 전",
    authorName: "권익성", authorDept: "전략기획", date: "오늘 06:22",
    warnBadge: "미답변 D-1",
  },
  {
    id: "1244",
    state: "answered",
    answerCount: 1,
    title: "QC role 사용자가 품질 spec 외 일반 품목 정보도 수정할 수 있나요?",
    snippet: "RBAC 9 role 매트릭스를 확인했는데, qc role 의 수정 가능 범위가 명확하지 않습니다. 가이드 문서 위치 안내 부탁드립니다.",
    tags: ["권한", "RBAC"],
    views: 89, comments: 2, agoLabel: "1주 전",
    authorName: "이수영", authorDept: "품질팀", date: "2026-05-15",
  },
  {
    id: "1243",
    state: "accepted",
    answerCount: 4,
    title: "품목 비활성화 후 다시 살리는 방법 — 관련 BOM 어떻게 복원되나요?",
    snippet: "실수로 활성 품목을 비활성화 했습니다. 복원은 가능한가요? BOM 영향은?",
    tags: ["품목등록", "복원"],
    views: 412, comments: 7, agoLabel: "2주 전",
    authorName: "박태준", authorDept: "IT기획", date: "2026-05-08",
  },
];

const TAB_LABELS: { key: QATab; label: string; count: number }[] = [
  { key: "all", label: "전체", count: 1247 },
  { key: "pending", label: "미답변", count: 158 },
  { key: "my", label: "내 질문", count: 7 },
  { key: "popular", label: "인기", count: 30 },
];

export function QAListPage() {
  const [tab, setTab] = useState<QATab>("all");
  const [sort, setSort] = useState("최신순");

  return (
    <>
      <div className="search-hero">
        <h2>무엇이 궁금하신가요?</h2>
        <p>이미 누군가 물어본 답일 수 있습니다. 검색 → 없으면 새 질문을 등록하세요.</p>
        <input type="search" className="sh-input" placeholder="질문을 검색하세요 — 예: BOM 등록 / 품목코드 규칙 / 단가 변경" />
        <div className="sh-tags">
          <span className="lbl">인기 태그</span>
          {["품목등록", "BOM", "단가변경", "권한", "엑셀업로드", "감사로그"].map((t) => (
            <a key={t} href="#" className="sh-tag">#{t}</a>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 18 }}>

        <section className="page-card" style={{ marginBottom: 0 }}>
          <div className="page-h">
            <div>
              <h1>Q&amp;A <span className="text-xs text-gray-500 font-normal ml-2">/ qna</span></h1>
              <div className="meta">전체 질문 1,247건 · 답변 완료 1,089 · 미답변 158 · 최근 24h 신규 12</div>
            </div>
            <div className="actions">
              <button className="btn-pri">+ 새 질문 작성</button>
            </div>
          </div>

          <div className="tabs">
            {TAB_LABELS.map((t) => (
              <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
                {t.label} <span className="text-xs text-gray-500 ml-1">{t.count.toLocaleString()}</span>
              </button>
            ))}
            <div style={{ flex: 1 }}></div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: "var(--app-fs)", alignSelf: "center" }}
            >
              <option>최신순</option>
              <option>답변 많은 순</option>
              <option>조회 많은 순</option>
              <option>채택률 높은 순</option>
            </select>
          </div>

          <div className="qa-list">
            {DUMMY_QA.map((q) => (
              <Link key={q.id} to={`/qna/thread/${q.id}`} className="qa-card" style={{ textDecoration: "none", color: "inherit" }}>
                <div className={`qa-stat ${q.state}`}>
                  <span className="num">{q.answerCount}</span>
                  <span className="lbl">답변</span>
                </div>
                <div className="qa-main">
                  <div className="qa-title">{q.title}</div>
                  <div className="qa-snippet">{q.snippet}</div>
                  <div className="qa-meta">
                    {q.tags.map((t) => <span key={t} className="qa-tag">{t}</span>)}
                    <span>👁 {q.views}</span>
                    <span>💬 {q.comments}</span>
                    <span>· {q.agoLabel}</span>
                    {q.warnBadge && <span className="badge b-warn">{q.warnBadge}</span>}
                  </div>
                </div>
                <div className="qa-author">
                  <span className="name">{q.authorName}</span>
                  <span>{q.authorDept}</span>
                  <span>{q.date}</span>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4, marginTop: 18, fontSize: "var(--app-fs-sm)" }}>
            <button className="btn-sec" style={{ padding: "4px 10px" }}>← 이전</button>
            <button className="btn-pri" style={{ padding: "4px 12px" }}>1</button>
            <button className="btn-sec" style={{ padding: "4px 12px" }}>2</button>
            <button className="btn-sec" style={{ padding: "4px 12px" }}>3</button>
            <span className="text-gray-500">…</span>
            <button className="btn-sec" style={{ padding: "4px 12px" }}>42</button>
            <button className="btn-sec" style={{ padding: "4px 10px" }}>다음 →</button>
          </div>
        </section>

        <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <div className="fg-title">🔥 인기 질문 (이번 주)</div>
            <ol style={{ fontSize: "var(--app-fs-sm)", lineHeight: 1.7, paddingLeft: 18, color: "var(--c-text)", margin: 0 }}>
              <li><Link to="/qna/thread/1247" style={{ color: "var(--c-text)", textDecoration: "none" }}>품목코드 규칙 — prefix 변경 가능?</Link><br/><span className="text-xs text-gray-500">조회 246 · 답변 3</span></li>
              <li style={{ marginTop: 8 }}><Link to="/qna/thread/1243" style={{ color: "var(--c-text)", textDecoration: "none" }}>품목 비활성화 후 복원 방법</Link><br/><span className="text-xs text-gray-500">조회 412 · 답변 4</span></li>
              <li style={{ marginTop: 8 }}><Link to="/qna/thread/1246" style={{ color: "var(--c-text)", textDecoration: "none" }}>BOM 일괄 업로드 양식 위치</Link><br/><span className="text-xs text-gray-500">조회 124 · 답변 2</span></li>
            </ol>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <div className="fg-title">⏳ 미답변 (D-1 초과)</div>
            <ol style={{ fontSize: "var(--app-fs-sm)", lineHeight: 1.7, paddingLeft: 18, color: "var(--c-text)", margin: 0 }}>
              <li><Link to="/qna/thread/1245" style={{ color: "var(--c-text)", textDecoration: "none" }}>단가 변경 사유 최소 글자수?</Link><br/><span className="text-xs" style={{ color: "#d97706" }}>⏰ 8시간 경과</span></li>
              <li style={{ marginTop: 8 }}><Link to="/qna/thread/1242" style={{ color: "var(--c-text)", textDecoration: "none" }}>엑셀 업로드 시 한글 깨짐</Link><br/><span className="text-xs" style={{ color: "#d97706" }}>⏰ 14시간 경과</span></li>
            </ol>
            <p style={{ fontSize: "var(--app-fs-xs)", color: "var(--c-text-sub)", marginTop: 10, lineHeight: 1.6 }}>
              관리자·해당 도메인 담당이 D-1 내 답변. 미답변은 일일 알림 발송.
            </p>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <div className="fg-title">📊 내 활동</div>
            <div style={{ fontSize: "var(--app-fs-sm)", color: "var(--c-text)", lineHeight: 1.8 }}>
              <div>내 질문 · <strong>7건</strong></div>
              <div>내 답변 · <strong>23건</strong></div>
              <div>채택된 답변 · <strong>14건</strong> <span className="badge b-approve">기여도 상위</span></div>
            </div>
          </div>

        </aside>

      </div>
    </>
  );
}
