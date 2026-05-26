type Props = { title: string; path: string };

export function PlaceholderPage({ title, path }: Props) {
  return (
    <section className="page-card">
      <div className="page-h">
        <div>
          <h1>
            {title}
            <span className="text-xs text-gray-500 font-normal ml-2">/ {path}</span>
          </h1>
          <div className="meta">SDS 골격만 적용된 자리표시 페이지. 실 구현은 Phase 1 이후.</div>
        </div>
      </div>
      <p className="text-text-sub">
        본 페이지는 라우팅 검증용입니다. 다음 단계: AG-Grid + Supabase 연결.
      </p>
    </section>
  );
}
