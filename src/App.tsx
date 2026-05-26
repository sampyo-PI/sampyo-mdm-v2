import { AppShell } from "./components/layout/AppShell";

function App() {
  return (
    <AppShell
      header={{
        brandCode: "MDM",
        systemName: "품목마스터DM",
        subtitle: "v2 · SDS v0.1",
        gnb: [
          { label: "대시보드", href: "#", active: true },
          { label: "품목등록", href: "#" },
          { label: "요청목록", href: "#" },
          { label: "카탈로그", href: "#" },
        ],
        searchPlaceholder: "품목코드 / 품명",
        qaUrl: "#",
        manualUrl: "#",
        user: { initial: "채", name: "채현석", deptRole: "PI팀" },
      }}
      sidebar={{
        groups: [
          {
            title: "품목마스터",
            links: [
              { label: "목록 (표준)", href: "#", active: true },
              { label: "상세 보기", href: "#" },
              { label: "수정·등록", href: "#" },
              { label: "모달 예시", href: "#" },
            ],
          },
          {
            title: "도움말",
            links: [
              { label: "Q&A 게시판", href: "#" },
              { label: "매뉴얼", href: "#" },
            ],
          },
        ],
      }}
    >
      <section className="page-card">
        <div className="page-h">
          <div>
            <h1>품목마스터 ▸ 목록</h1>
            <div className="meta">SDS 토큰 + Pretendard + 헤더/사이드바 통합 검증</div>
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

        <div className="section-title">상태 분포</div>
        <div className="flex gap-2 flex-wrap">
          <span className="badge b-approve">APPROVED</span>
          <span className="badge b-submit">PENDING</span>
          <span className="badge b-warn">검토중</span>
          <span className="badge b-error">REJECTED</span>
          <span className="badge b-draft">DRAFT</span>
          <span className="badge b-closed">종료</span>
        </div>
      </section>
    </AppShell>
  );
}

export default App;
