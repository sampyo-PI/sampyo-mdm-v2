import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function LoginPage() {
  const { user, signInGoogle, signOut, loading } = useAuth();
  const navigate = useNavigate();

  // 로그인 직후 OAuth redirect로 /login에 안착했으면 카탈로그로 자동 이동
  useEffect(() => {
    if (user && !loading) {
      const timer = setTimeout(() => navigate("/", { replace: true }), 1200);
      return () => clearTimeout(timer);
    }
  }, [user, loading, navigate]);

  const origin = typeof window !== "undefined" ? window.location.origin : "(SSR)";
  const base = import.meta.env.BASE_URL;
  const redirectTo = `${origin}${base}login`.replace(/\/+/g, "/").replace(":/", "://");

  return (
    <section className="page-card">
      <div className="page-h">
        <div>
          <h1>
            로그인
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 max-w-4xl">
        <div className="kpi accent">
          <div className="label">현재 상태</div>
          <div className="val text-base">
            {loading ? "확인 중…" : user ? user.email : "로그아웃 상태"}
          </div>
          {user && (
            <div className="delta text-gray-500">
              UID: {user.id.slice(0, 8)}… · provider: {user.app_metadata?.provider ?? "unknown"}
            </div>
          )}
        </div>

        <div className="kpi">
          <div className="label">RLS 영향</div>
          <div className="val text-base">
            {user ? "items 조회 가능" : "items 0건 (auth.uid() IS NULL)"}
          </div>
          <div className="delta text-gray-500">
            대부분 테이블은 인증 필수, 일부(companies/category_*) anon 허용
          </div>
        </div>
      </div>

      <div className="mt-6 callout">
        <strong>OAuth 진단 정보</strong>
        <ul className="mt-2 text-sm font-mono">
          <li>window.location.origin: <code>{origin}</code></li>
          <li>redirectTo: <code>{redirectTo}</code></li>
          <li>현재 URL 해시: <code>{typeof window !== "undefined" ? (window.location.hash || "(없음)") : "(SSR)"}</code></li>
        </ul>
      </div>

      <div className="mt-6 flex gap-3">
        {user ? (
          <button className="btn-sec" onClick={() => void signOut()}>
            로그아웃
          </button>
        ) : (
          <button className="btn-pri" onClick={() => void signInGoogle()} disabled={loading}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }}
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google로 로그인
          </button>
        )}
      </div>

      <div className="mt-8 callout">
        <strong>도메인 제한:</strong> 본 시스템은 <code>@sampyo.co.kr</code> /{" "}
        <code>@sampyoenc.com</code> 계정만 사용 가능합니다. 그 외 계정으로 로그인 시 자동 로그아웃됩니다.
      </div>
    </section>
  );
}
