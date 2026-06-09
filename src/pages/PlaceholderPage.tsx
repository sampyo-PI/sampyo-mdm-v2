type Props = { title: string; path?: string };

export function PlaceholderPage({ title }: Props) {
  return (
    <section className="page-card">
      <div className="page-h">
        <div>
          <h1>
            {title}
          </h1>
        </div>
      </div>
      <p className="text-text-sub">
        본 페이지는 라우팅 검증용입니다. 다음 단계: AG-Grid + Supabase 연결.
      </p>
    </section>
  );
}
