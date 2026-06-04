import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { rest } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export type QnaCategory = "bug" | "improvement" | "question" | "other";

export type ExistingPost = {
  id: string;
  category: QnaCategory;
  title: string;
  body: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (postId?: string) => void;
  existing?: ExistingPost;
};

const CATEGORY_OPTIONS: { value: QnaCategory; label: string }[] = [
  { value: "bug", label: "버그" },
  { value: "improvement", label: "개선요청" },
  { value: "question", label: "질문" },
  { value: "other", label: "기타" },
];

export function QnaPostDialog({ open, onClose, onSaved, existing }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!existing;

  const [category, setCategory] = useState<QnaCategory>("improvement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setCategory(existing.category);
      setTitle(existing.title);
      setBody(existing.body);
    } else {
      setCategory("improvement");
      setTitle("");
      setBody("");
    }
    setErr(null);
  }, [open, existing]);

  const save = useMutation({
    mutationFn: async () => {
      const t = title.trim();
      const b = body.trim();
      if (!user) throw new Error("로그인이 필요합니다");
      if (t.length < 2) throw new Error("제목을 2자 이상 입력해주세요");
      if (b.length < 1) throw new Error("본문을 입력해주세요");
      if (t.length > 200) throw new Error("제목은 200자 이내");
      if (b.length > 10000) throw new Error("본문은 10,000자 이내");

      if (isEdit && existing) {
        await rest("PATCH", "qna_posts", {
          params: { id: `eq.${existing.id}` },
          body: { category, title: t, body: b },
          prefer: "return=representation",
        });
        return existing.id;
      }
      const rows = await rest<Array<{ id: string }>>("POST", "qna_posts", {
        body: { author_user_id: user.id, category, title: t, body: b, status: "OPEN" },
        prefer: "return=representation",
      });
      return rows?.[0]?.id;
    },
    onSuccess: (postId) => {
      qc.invalidateQueries({ queryKey: ["qna-posts"] });
      if (postId) qc.invalidateQueries({ queryKey: ["qna-post", postId] });
      onSaved(postId);
    },
    onError: (e) => setErr(e instanceof Error ? e.message : String(e)),
  });

  if (!open) return null;

  return (
    <div className="qna-modal-overlay" onClick={onClose}>
      <div className="qna-modal" onClick={(e) => e.stopPropagation()}>
        <style>{MODAL_STYLES}</style>
        <div className="qm-h">{isEdit ? "글 수정" : "새 질문 작성"}</div>
        <div className="qm-desc">테스트 기간 개선요청 / 버그 / 질문을 자유롭게 작성해주세요. 모든 직원에게 공개됩니다.</div>

        <div className="qm-field">
          <label>카테고리</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as QnaCategory)}>
            {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="qm-field">
          <label>제목 <span className="qm-count">{title.length}/200</span></label>
          <input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="예: 카탈로그 검색 결과가 1,000건에서 멈춰요" />
        </div>

        <div className="qm-field">
          <label>본문 <span className="qm-count">{body.length}/10,000</span></label>
          <textarea value={body} maxLength={10000} rows={10} onChange={(e) => setBody(e.target.value)} placeholder="발견한 문제·재현 절차·기대 동작 / 개선 아이디어 등을 자유롭게 적어주세요" />
        </div>

        {err && <div className="qm-err">{err}</div>}

        <div className="qm-foot">
          <button className="btn-sec" onClick={onClose} disabled={save.isPending}>취소</button>
          <button className="btn-pri" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "저장 중…" : isEdit ? "수정" : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}

const MODAL_STYLES = `
.qna-modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.qna-modal { background: #fff; border-radius: 12px; width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; padding: 22px 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.25); }
.qna-modal .qm-h { font-size: 18px; font-weight: 700; color: #003876; }
.qna-modal .qm-desc { font-size: 13px; color: #64748b; margin: 4px 0 16px; }
.qna-modal .qm-field { margin-bottom: 14px; }
.qna-modal .qm-field label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
.qna-modal .qm-count { float: right; font-weight: 400; color: #94a3b8; }
.qna-modal .qm-field input, .qna-modal .qm-field select, .qna-modal .qm-field textarea {
  width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; font-size: 14px; color: #1f2937; font-family: inherit;
}
.qna-modal .qm-field input:focus, .qna-modal .qm-field select:focus, .qna-modal .qm-field textarea:focus { outline: none; border-color: #003876; box-shadow: 0 0 0 2px rgba(0,56,118,0.1); }
.qna-modal .qm-field textarea { resize: vertical; }
.qna-modal .qm-err { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; font-size: 13px; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; }
.qna-modal .qm-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
`;
