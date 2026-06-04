import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rest } from "../lib/supabase";
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
type CommentRow = { id: string; post_id: string; author_user_id: string; body: string; created_at: string };

const CATEGORY_LABEL: Record<QnaCategory, string> = { bug: "버그", improvement: "개선요청", question: "질문", other: "기타" };
const fmt = (s: string) => new Date(s).toLocaleString("ko-KR");

export function QAThreadPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();

  const [commentBody, setCommentBody] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["qna-post", id],
    enabled: !!id,
    queryFn: async () => {
      const [postRows, comments] = await Promise.all([
        rest<PostRow[]>("GET", "qna_posts", { params: { select: "*", id: `eq.${id}`, limit: "1" } }),
        rest<CommentRow[]>("GET", "qna_comments", { params: { select: "*", post_id: `eq.${id}`, order: "created_at.asc" } }),
      ]);
      const post = postRows[0] ?? null;
      if (!post) return { post: null, comments: [], names: new Map<string, { name: string; dept: string }>() };
      const userIds = Array.from(new Set([post.author_user_id, ...comments.map((c) => c.author_user_id)])).filter(Boolean);
      const profiles = userIds.length
        ? await rest<Array<{ user_id: string; display_name: string | null; department: string | null }>>("GET", "profiles", {
            params: { select: "user_id,display_name,department", user_id: `in.(${userIds.join(",")})` },
          })
        : [];
      const names = new Map(profiles.map((p) => [p.user_id, { name: p.display_name || "(알 수 없음)", dept: p.department || "" }]));
      return { post, comments, names };
    },
    staleTime: 20_000,
  });

  const post = data?.post ?? null;
  const comments = data?.comments ?? [];
  const names = data?.names ?? new Map();

  const isAuthor = !!user && !!post && user.id === post.author_user_id;
  const canManage = isAuthor || isAdmin;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["qna-post", id] });
    qc.invalidateQueries({ queryKey: ["qna-posts"] });
  };

  const addComment = useMutation({
    mutationFn: async () => {
      const b = commentBody.trim();
      if (!user) throw new Error("로그인이 필요합니다");
      if (b.length < 1) throw new Error("댓글을 입력해주세요");
      if (b.length > 5000) throw new Error("댓글은 5,000자 이내");
      await rest("POST", "qna_comments", { body: { post_id: id, author_user_id: user.id, body: b }, prefer: "return=representation" });
    },
    onSuccess: () => { setCommentBody(""); setErr(null); invalidate(); },
    onError: (e) => setErr(e instanceof Error ? e.message : String(e)),
  });

  const delComment = useMutation({
    mutationFn: async (cid: string) => { await rest("DELETE", "qna_comments", { params: { id: `eq.${cid}` } }); },
    onSuccess: invalidate,
    onError: (e) => setErr(e instanceof Error ? e.message : String(e)),
  });

  const toggleStatus = useMutation({
    mutationFn: async () => {
      if (!post) return;
      const next = post.status === "OPEN" ? "CLOSED" : "OPEN";
      await rest("PATCH", "qna_posts", { params: { id: `eq.${post.id}` }, body: { status: next } });
    },
    onSuccess: invalidate,
    onError: (e) => setErr(e instanceof Error ? e.message : String(e)),
  });

  const delPost = useMutation({
    mutationFn: async () => {
      if (!post) return;
      if (!window.confirm("게시글을 삭제할까요? 관련 댓글도 함께 삭제됩니다. 되돌릴 수 없습니다.")) throw new Error("__cancel__");
      await rest("DELETE", "qna_comments", { params: { post_id: `eq.${post.id}` } });
      await rest("DELETE", "qna_posts", { params: { id: `eq.${post.id}` } });
    },
    onSuccess: () => { invalidate(); navigate("/qna"); },
    onError: (e) => { if (!(e instanceof Error && e.message === "__cancel__")) setErr(e instanceof Error ? e.message : String(e)); },
  });

  const authorMeta = useMemo(() => (post ? names.get(post.author_user_id) : undefined), [post, names]);

  if (isLoading) return <section className="page-card"><div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>불러오는 중…</div></section>;
  if (!post) return (
    <section className="page-card">
      <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
        게시글을 찾을 수 없습니다. <Link to="/qna" style={{ color: "#003876" }}>목록으로</Link>
      </div>
    </section>
  );

  return (
    <section className="page-card">
      <div className="breadcrumb">
        <Link to="/qna">Q&amp;A 게시판</Link>
        <span className="sep">›</span>
        <span>{CATEGORY_LABEL[post.category]}</span>
      </div>

      {err && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 13, padding: "8px 12px", borderRadius: 6, marginBottom: 12 }} onClick={() => setErr(null)}>{err} (클릭하여 닫기)</div>}

      <article className="qa-question">
        <div className="qq-body" style={{ display: "block" }}>
          <div className="qq-content">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <h2>{post.title}</h2>
              {canManage && (
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button className="btn-sec" style={{ fontSize: 12 }} onClick={() => toggleStatus.mutate()} disabled={toggleStatus.isPending}>
                    {post.status === "OPEN" ? "🔒 종료" : "🔓 다시 열기"}
                  </button>
                  <button className="btn-sec" style={{ fontSize: 12 }} onClick={() => setEditOpen(true)}>✏ 수정</button>
                  <button className="btn-sec" style={{ fontSize: 12, color: "#dc2626", borderColor: "#fca5a5" }} onClick={() => delPost.mutate()} disabled={delPost.isPending}>🗑 삭제</button>
                </div>
              )}
            </div>
            <div className="qq-meta">
              <span className="qa-tag">{CATEGORY_LABEL[post.category]}</span>
              {post.status === "OPEN" ? <span className="badge b-warn">미해결</span> : <span className="badge b-approve">종료</span>}
              <span>💬 댓글 {comments.length}</span>
              <span>· 작성 {fmt(post.created_at)}</span>
              {post.updated_at !== post.created_at && <span>· 수정 {fmt(post.updated_at)}</span>}
            </div>

            <div className="doc-prose" style={{ whiteSpace: "pre-wrap", minHeight: 160, paddingTop: 12 }}>{post.body}</div>

            <div className="qq-author-card">
              <div className="avatar">{(authorMeta?.name || "?").slice(0, 1)}</div>
              <div>
                <div className="label">질문자 · {fmt(post.created_at)}</div>
                <div className="name">{authorMeta?.name || "(알 수 없음)"}{authorMeta?.dept ? ` · ${authorMeta.dept}` : ""}</div>
              </div>
            </div>
          </div>
        </div>
      </article>

      <div className="qa-answers-h">댓글 {comments.length}개</div>

      <div className="qa-comments" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {comments.length === 0 ? (
          <div style={{ color: "#94a3b8", fontSize: 14, padding: "12px 0" }}>아직 댓글이 없습니다</div>
        ) : (
          comments.map((c) => {
            const m = names.get(c.author_user_id);
            const canDel = (!!user && user.id === c.author_user_id) || isAdmin;
            return (
              <div key={c.id} className="qa-comment" style={{ display: "block" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <span className="c-author">{m?.name || "(알 수 없음)"}{m?.dept ? ` · ${m.dept}` : ""}</span>
                  <span style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <span className="c-time">{fmt(c.created_at)}</span>
                    {canDel && <button onClick={() => delComment.mutate(c.id)} style={{ border: "none", background: "none", color: "#94a3b8", cursor: "pointer", fontSize: 12 }} title="삭제">🗑</button>}
                  </span>
                </div>
                <div style={{ whiteSpace: "pre-wrap", fontSize: 14, color: "#1f2937" }}>{c.body}</div>
              </div>
            );
          })
        )}
      </div>

      <div className="qa-write">
        <h3>댓글 작성</h3>
        {user ? (
          <>
            <textarea value={commentBody} maxLength={5000} onChange={(e) => setCommentBody(e.target.value)} placeholder="댓글을 입력하세요" />
            <div className="qw-foot">
              <span className="qw-hint">{commentBody.length}/5,000</span>
              <button className="btn-pri" onClick={() => addComment.mutate()} disabled={addComment.isPending}>{addComment.isPending ? "등록 중…" : "등록"}</button>
            </div>
          </>
        ) : (
          <div style={{ color: "#94a3b8", fontSize: 14, padding: "8px 0" }}>댓글 작성은 로그인이 필요합니다</div>
        )}
      </div>

      <QnaPostDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => setEditOpen(false)}
        existing={{ id: post.id, category: post.category, title: post.title, body: post.body }}
      />
    </section>
  );
}
