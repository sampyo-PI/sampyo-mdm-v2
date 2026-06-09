import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

/**
 * Supabase 연결 + RLS 검증용. companies는 RLS가 SELECT all 정책 → 익명도 조회 가능.
 */
export function ConnectionTestPage() {
  const { session, user, loading: authLoading } = useAuth();

  const companies = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("companies")
        .select("*", { count: "exact" })
        .order("code");
      if (error) throw error;
      return { rows: data, count };
    },
  });

  return (
    <section className="page-card">
      <div className="page-h">
        <div>
          <h1>
            Supabase 연결 검증
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="kpi accent">
          <div className="label">인증 상태</div>
          <div className="val text-base">
            {authLoading ? "확인 중…" : session ? "로그인" : "익명 (Anonymous)"}
          </div>
          {user && <div className="delta text-gray-500">{user.email}</div>}
        </div>
        <div className="kpi">
          <div className="label">회사 수 (companies)</div>
          <div className="val">
            {companies.isLoading ? "…" : companies.isError ? "ERR" : companies.data?.count ?? "?"}
          </div>
        </div>
        <div className="kpi">
          <div className="label">VITE_SUPABASE_URL</div>
          <div className="val text-base">
            {import.meta.env.VITE_SUPABASE_URL?.includes("xziehhunxvxxwtqkzobv") ? "✓" : "✗"}
          </div>
        </div>
      </div>

      {companies.isError && (
        <div className="callout callout-error">
          <strong>오류:</strong> {(companies.error as Error).message}
        </div>
      )}

      {companies.data && (
        <>
          <div className="section-title">법인 마스터 ({companies.data.count}건)</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">code</th>
                <th className="px-3 py-2 text-left">name</th>
                <th className="px-3 py-2 text-left">is_active</th>
              </tr>
            </thead>
            <tbody>
              {(companies.data.rows as Array<{ code: string; name: string; is_active: boolean }>).map(
                (r) => (
                  <tr key={r.code} className="border-t border-border">
                    <td className="px-3 py-1.5 font-mono">{r.code}</td>
                    <td className="px-3 py-1.5">{r.name}</td>
                    <td className="px-3 py-1.5">
                      <span className={`badge ${r.is_active ? "b-approve" : "b-draft"}`}>
                        {r.is_active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
