import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

const ALLOWED_DOMAINS = ["sampyo.co.kr", "sampyoenc.com"];

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  loading: true,
  signInGoogle: async () => {},
  signOut: async () => {},
});

function isAllowedEmail(email: string | undefined) {
  if (!email) return false;
  return ALLOWED_DOMAINS.some((d) => email.toLowerCase().endsWith(`@${d}`));
}

/**
 * Phase 1 인증:
 *  - Google OAuth signInWithOAuth
 *  - ALLOWED_DOMAINS 검증 (실패 시 즉시 signOut + alert)
 *  - 세션 변화 추적
 *
 * Phase 2+: pending_user_roles RPC 자동 부여, 프로필 로드, isAdmin/isReviewer 등
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      // 도메인 검증
      if (s?.user && !isAllowedEmail(s.user.email)) {
        alert(
          `${ALLOWED_DOMAINS.map((d) => "@" + d).join(" / ")} 계정만 사용 가능합니다.\n로그아웃합니다.`,
        );
        void supabase.auth.signOut();
        return;
      }
      setSession(s);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInGoogle = async () => {
    // Vite BASE_URL 그대로 사용 (/v2/ 또는 /). hostname 기반 → Supabase URI_ALLOW_LIST 매칭
    const base = import.meta.env.BASE_URL; // 예: "/v2/" 또는 "/"
    const redirectTo = `${window.location.origin}${base}login`.replace(/\/+/g, "/").replace(":/", "://");
    // eslint-disable-next-line no-console
    console.log("[auth] signInGoogle redirectTo:", redirectTo);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) alert(`Google 로그인 실패: ${error.message}`);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, loading, signInGoogle, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
