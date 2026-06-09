import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function LoginPage() {
  const { user, signInGoogle, signOut, loading } = useAuth();
  const navigate = useNavigate();

  // 로그인 직후 OAuth redirect로 /login에 안착했으면 홈으로 자동 이동
  useEffect(() => {
    if (user && !loading) {
      const timer = setTimeout(() => navigate("/", { replace: true }), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, loading, navigate]);

  return (
    <div className="login-wrap">
      <style>{LOGIN_STYLES}</style>
      <div className="login-card">
        <div className="brand">
          <span className="brand-mark">MDM</span>
          <div className="brand-text">
            <div className="sys">삼표품목코드시스템</div>
            <div className="sys-sub">품목코드 관리 (Master Data Management)</div>
          </div>
        </div>

        {user ? (
          <>
            <div className="signed-in">
              <div className="si-label">로그인됨</div>
              <div className="si-email">{user.email}</div>
            </div>
            <button className="login-btn ghost" onClick={() => void signOut()}>로그아웃</button>
          </>
        ) : (
          <button className="login-btn google" onClick={() => void signInGoogle()} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {loading ? "확인 중…" : "Google 계정으로 로그인"}
          </button>
        )}

        <div className="login-note">
          <strong>@sampyo.co.kr</strong> / <strong>@sampyoenc.com</strong> 계정만 사용 가능합니다.
        </div>
      </div>
    </div>
  );
}

const LOGIN_STYLES = `
.login-wrap { width: 100%; display: flex; justify-content: center; padding: 24px; }
.login-card { width: 100%; max-width: 400px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 10px 30px rgba(15,23,42,0.08); padding: 36px 32px; text-align: center; }
.login-card .brand { display: flex; align-items: center; gap: 12px; justify-content: center; margin-bottom: 28px; }
.login-card .brand-mark { background: #003876; color: #fff; font-weight: 800; font-size: 16px; padding: 8px 12px; border-radius: 10px; letter-spacing: 0.5px; }
.login-card .brand-text { text-align: left; }
.login-card .sys { font-size: 18px; font-weight: 700; color: #003876; line-height: 1.2; }
.login-card .sys-sub { font-size: 12px; color: #94a3b8; margin-top: 2px; }
.login-btn { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 12px 16px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; }
.login-btn.google { background: #fff; color: #1f2937; border: 1px solid #cbd5e1; }
.login-btn.google:hover { background: #f8fafc; border-color: #003876; }
.login-btn.google:disabled { opacity: 0.6; cursor: not-allowed; }
.login-btn.ghost { background: #fff; color: #003876; border: 1px solid #cbd5e1; }
.login-btn.ghost:hover { background: #eff6ff; }
.signed-in { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
.signed-in .si-label { font-size: 12px; color: #16a34a; font-weight: 600; }
.signed-in .si-email { font-size: 14px; color: #166534; font-weight: 600; margin-top: 2px; }
.login-note { margin-top: 20px; font-size: 12px; color: #64748b; line-height: 1.6; }
.login-note strong { color: #003876; }
`;
