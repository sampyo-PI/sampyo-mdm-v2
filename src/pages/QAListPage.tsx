import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { rest, rpc } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { QnaPostDialog, type QnaCategory } from "../components/QnaPostDialog";

type PostRow = {
  id: string;
  author_user_id: string;
  category: QnaCategory;
  status: "OPEN" | "CLOSED";
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
};
type Post = PostRow & { authorName: string; authorDept: string; commentCount: number };

type Tab = "all" | "open" | "my" | "closed";
type CatFilter = "all" | QnaCategory;

const CATEGORY_LABEL: Record<QnaCategory, string> = { bug: "버그", improvement: "개선요청", question: "질문", other: "기타" };

function cardState(p: Post): "accepted" | "answered" | "pending" {
  if (p.status === "CLOSED") return "accepted";
  return p.commentCount > 0 ? "answered" : "pending";
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" });
}

export function QAListPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [cat, setCat] = useState<CatFilter>("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["qna-posts"],
    queryFn: async () => {
      const rows = await rest<PostRow[]>("GET", "qna_posts", {
        params: { select: "id,author_user_id,category,status,title,body,created_at,updated_at", order: "created_at.desc", limit: "500" },
      });
      const userIds = Array.from(new Set(rows.map((r) => r.author_user_id))).filter(Boolean);
      const postIds = rows.map((r) => r.id);
      const [profiles, counts] = await Promise.all([
        userIds.length
          ? rest<Array<{ user_id: string; display_name: string | null; department: string | null }>>("GET", "profiles", {
              params: { select: "user_id,display_name,department", user_id: `in.(${userIds.join(",")})` },
            })
          : Promise.resolve([]),
        postIds.length ? rpc<Array<{ post_id: string; comment_count: number }>>("get_qna_post_comment_counts", { p_post_ids: postIds }) : Promise.resolve([]),
      ]);
      const nameMap = new Map(profiles.map((p) => [p.user_id, p]));
      const cntMap = new Map(counts.map((c) => [c.post_id, Number(c.comment_count) || 0]));
      return rows.map<Post>((r) => ({
        ...r,
        authorName: nameMap.get(r.author_user_id)?.display_name || "(알 수 없음)",
        authorDept: nameMap.get(r.author_user_id)?.department || "",
        commentCount: cntMap.get(r.id) ?? 0,
      }));
    },
    staleTime: 30_000,
  });

  const tabCounts = useMemo(() => ({
    all: posts.length,
    open: posts.filter((p) => p.status === "OPEN").length,
    my: user ? posts.filter((p) => p.author_user_id === user.id).length : 0,
    closed: posts.filter((p) => p.status === "CLOSED").length,
  }), [posts, user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      if (tab === "open" && p.status !== "OPEN") return false;
      if (tab === "closed" && p.status !== "CLOSED") return false;
      if (tab === "my" && (!user || p.author_user_id !== user.id)) return false;
      if (cat !== "all" && p.category !== cat) return false;
      if (q && !(p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q) || p.authorName.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [posts, tab, cat, search, user]);

  const popular = useMemo(() => [...posts].sort((a, b) => b.commentCount - a.commentCount).slice(0, 3), [posts]);
  const unanswered = useMemo(() => posts.filter((p) => p.status === "OPEN" && p.commentCount === 0).slice(0, 4), [posts]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "open", label: "미해결" },
    { key: "my", label: "내 질문" },
    { key: "closed", label: "종료" },
  ];

  return (
    <>
      <div className="search-hero">
        <h2>무엇이 궁금하신가요?</h2>
        <p>이미 누군가 물어본 답일 수 있습니다. 검색 → 없으면 새 질문을 등록하세요.</p>
        <input type="search" className="sh-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="질문을 검색하세요 — 제목·본문·작성자" />
        <div className="sh-tags">
          <span className="lbl">카테고리</span>
          <button className="sh-tag" onClick={() => setCat("all")} style={cat === "all" ? activeTag : undefined}>전체</button>
          {(Object.keys(CATEGORY_LABEL) as QnaCategory[]).map((c) => (
            <button key={c} className="sh-tag" onClick={() => setCat(c)} style={cat === c ? activeTag : undefined}>#{CATEGORY_LABEL[c]}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 18 }}>
        <section className="page-card" style={{ marginBottom: 0 }}>
          <div className="page-h">
            <div>
              <h1>Q&amp;A <span className="text-xs text-gray-500 font-normal ml-2">/ qna</span></h1>
              <div className="meta">
                전체 {tabCounts.all}건 · 미해결 {tabCounts.open} · 종료 {tabCounts.closed}
                {isLoading && " · 불러오는 중…"}
              </div>
            </div>
            <div className="actions">
              <button className="btn-pri" onClick={() => setDialogOpen(true)} disabled={!user} title={user ? "" : "로그인이 필요합니다"}>+ 새 질문 작성</button>
            </div>
          </div>

          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
                {t.label} <span className="text-xs text-gray-500 ml-1">{tabCounts[t.key]}</span>
              </button>
            ))}
          </div>

          <div className="qa-list">
            {isLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>불러오는 중…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: 36, opacity: 0.4 }}>💬</div>
                <div style={{ marginTop: 8 }}>조건에 맞는 글이 없습니다</div>
                <div className="text-xs" style={{ marginTop: 4 }}>우측 상단 [새 질문 작성]으로 첫 글을 남겨주세요</div>
              </div>
            ) : (
              filtered.map((q) => (
                <Link key={q.id} to={`/qna/thread/${q.id}`} className="qa-card" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className={`qa-stat ${cardState(q)}`}>
                    <span className="num">{q.commentCount}</span>
                    <span className="lbl">댓글</span>
                  </div>
                  <div className="qa-main">
                    <div className="qa-title">{q.title}</div>
                    <div className="qa-snippet">{q.body.length > 120 ? q.body.slice(0, 120) + "…" : q.body}</div>
                    <div className="qa-meta">
                      <span className="qa-tag">{CATEGORY_LABEL[q.category]}</span>
                      <span>💬 {q.commentCount}</span>
                      <span>· {fmtDate(q.created_at)}</span>
                      {q.status === "OPEN" ? <span className="badge b-warn">미해결</span> : <span className="badge b-approve">종료</span>}
                    </div>
                  </div>
                  <div className="qa-author">
                    <span className="name">{q.authorName}</span>
                    {q.authorDept && <span>{q.authorDept}</span>}
                    <span>{fmtDate(q.created_at)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div className="fg-title">🔥 댓글 많은 질문</div>
            {popular.length === 0 ? (
              <div className="text-xs text-gray-500">데이터 없음</div>
            ) : (
              <ol style={{ fontSize: "var(--app-fs-sm)", lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
                {popular.map((p) => (
                  <li key={p.id} style={{ marginBottom: 6 }}>
                    <Link to={`/qna/thread/${p.id}`} style={{ color: "var(--c-text)", textDecoration: "none" }}>{p.title}</Link>
                    <br /><span className="text-xs text-gray-500">댓글 {p.commentCount} · {CATEGORY_LABEL[p.category]}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <div className="fg-title">⏳ 미답변 (댓글 0)</div>
            {unanswered.length === 0 ? (
              <div className="text-xs text-gray-500">미답변 글이 없습니다 👍</div>
            ) : (
              <ol style={{ fontSize: "var(--app-fs-sm)", lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
                {unanswered.map((p) => (
                  <li key={p.id} style={{ marginBottom: 6 }}>
                    <Link to={`/qna/thread/${p.id}`} style={{ color: "var(--c-text)", textDecoration: "none" }}>{p.title}</Link>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <div className="fg-title">📊 내 활동</div>
            <div style={{ fontSize: "var(--app-fs-sm)", color: "var(--c-text)", lineHeight: 1.8 }}>
              <div>내 질문 · <strong>{tabCounts.my}건</strong></div>
            </div>
          </div>
        </aside>
      </div>

      <QnaPostDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={() => setDialogOpen(false)} />
    </>
  );
}

const activeTag: React.CSSProperties = { background: "#003876", color: "#fff", borderColor: "#003876" };
