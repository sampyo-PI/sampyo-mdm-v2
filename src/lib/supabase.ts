import { createClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY 환경변수 누락. .env 확인.");
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});

/** native fetch 헬퍼 — supabase-js PostgrestBuilder.then hang 우회용
 *  사용: rest("GET", "item_requests", { params: { requester_id: "eq.xxx", select: "id,..." } })
 *  토큰은 localStorage에서 직접 읽음 (supabase.auth.getSession()이 hang하는 케이스 회피)
 */
function readAccessTokenFromLocalStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const keys = Object.keys(window.localStorage);
    const tokenKey = keys.find((k) => /sb-.*-auth-token/.test(k));
    if (!tokenKey) return null;
    const raw = window.localStorage.getItem(tokenKey);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function rest<T = unknown>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  table: string,
  options: { params?: Record<string, string>; body?: unknown; prefer?: string } = {},
): Promise<T> {
  const accessToken = readAccessTokenFromLocalStorage() ?? SUPABASE_PUBLISHABLE_KEY;
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  if (options.params) {
    for (const [k, v] of Object.entries(options.params)) url.searchParams.set(k, v);
  }
  const headers: Record<string, string> = {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  if (options.prefer) headers.Prefer = options.prefer;
  const r = await fetch(url.toString(), {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`rest ${method} ${table} → ${r.status}: ${txt}`);
  }
  return (await r.json()) as T;
}

/** RPC 호출 native fetch wrapper — supabase.rpc() hang 우회 */
export async function rpc<T = unknown>(fnName: string, args?: Record<string, unknown>): Promise<T> {
  const accessToken = readAccessTokenFromLocalStorage() ?? SUPABASE_PUBLISHABLE_KEY;
  const url = `${SUPABASE_URL}/rest/v1/rpc/${fnName}`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args ?? {}),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`rpc ${fnName} → ${r.status}: ${txt}`);
  }
  return (await r.json()) as T;
}
