import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, rest } from "../lib/supabase";

const ALLOWED_DOMAINS = ["sampyo.co.kr", "sampyoenc.com"];

export type Profile = {
  user_id: string;
  display_name: string | null;
  department: string | null;
  position: string | null;
  emp_no: string | null;
  company_id: string | null;
};

export type AppRole = "user" | "reviewer" | "admin";

export type UserRole = {
  role: AppRole;
  /** NULL = 전사, UUID = 특정 회사 한정 (reviewer만 의미 있음) */
  company_id: string | null;
};

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: UserRole[];
  isAdmin: boolean;
  isReviewer: boolean;
  /** reviewer가 검토 가능한 회사 ID 목록 (NULL이면 전사 reviewer) */
  reviewerCompanyIds: (string | null)[];
  loading: boolean;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  profile: null,
  roles: [],
  isAdmin: false,
  isReviewer: false,
  reviewerCompanyIds: [],
  loading: true,
  signInGoogle: async () => {},
  signOut: async () => {},
});

function isAllowedEmail(email: string | undefined) {
  if (!email) return false;
  return ALLOWED_DOMAINS.some((d) => email.toLowerCase().endsWith(`@${d}`));
}

/**
 * v2 인증:
 *  - Google OAuth + ALLOWED_DOMAINS 검증
 *  - profile + user_roles 로드
 *  - isAdmin / isReviewer / reviewerCompanyIds 도출
 *  - apply_pending_user_roles RPC 호출 (사전등록 권한 부여)
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  // user_roles + profile fetch (로그인 시 / 세션 갱신 시) — rest 헬퍼 사용
  const loadUserData = async (user: User) => {
    // 1. pending_user_roles 자동 부여 (idempotent, RPC)
    try {
      await rest("POST", "rpc/apply_pending_user_roles", {
        body: { p_user_id: user.id, p_email: user.email ?? "" },
      });
    } catch {
      // RPC 실패해도 진행 (이미 부여됐을 수 있음)
    }

    // 2. profile + roles 동시 로드
    try {
      const [profiles, roles] = await Promise.all([
        rest<Profile[]>("GET", "profiles", {
          params: {
            select: "user_id,display_name,department,position,emp_no,company_id",
            user_id: `eq.${user.id}`,
            limit: "1",
          },
        }),
        rest<UserRole[]>("GET", "user_roles", {
          params: { select: "role,company_id", user_id: `eq.${user.id}` },
        }),
      ]);
      setProfile(profiles[0] ?? null);
      setRoles(roles ?? []);
    } catch (e) {
      console.error("[auth] loadUserData failed:", e);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        await loadUserData(data.session.user);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
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
      if (s?.user) {
        await loadUserData(s.user);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInGoogle = async () => {
    const base = import.meta.env.BASE_URL;
    const redirectTo = `${window.location.origin}${base}login`.replace(/\/+/g, "/").replace(":/", "://");
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

  // 권한 도출
  const isAdmin = roles.some((r) => r.role === "admin");
  const reviewerRoles = roles.filter((r) => r.role === "reviewer");
  const isReviewer = reviewerRoles.length > 0 || isAdmin;
  const reviewerCompanyIds = reviewerRoles.map((r) => r.company_id);

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        roles,
        isAdmin,
        isReviewer,
        reviewerCompanyIds,
        loading,
        signInGoogle,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
