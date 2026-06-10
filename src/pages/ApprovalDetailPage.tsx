import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchApprovalBundle,
  getStepStates,
  type ApprovalBundle,
} from "../lib/approvalQueries";
import { STATUS_LABEL } from "../lib/requestsQueries";
import {
  approveRequest, rejectRequest, escalateToRequester,
  checkTeamReviewer, getCurrentReviewStep, getNextStatus,
} from "../lib/approvalActions";
import { useAuth } from "../contexts/AuthContext";

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

type StepState = "done" | "current" | "pending";

function ReviewInline({ bundle }: { bundle: ApprovalBundle }) {
  const steps = getStepStates(bundle.request.status, bundle.request);
  const stepClass = (s: StepState) => `step-pill${s === "done" ? " done" : s === "current" ? " current" : ""}`;
  const sLabel = STATUS_LABEL[bundle.request.status];
  return (
    <div className="review-inline" title="검토 진행 상태">
      <span className={stepClass(steps.step1)}>
        <span className="num">1</span>
        <span className="lbl">1차 AI</span>
        {steps.step1 === "done" && <span className="check">✓</span>}
      </span>
      <span className="arrow">▸</span>
      <span className={stepClass(steps.step2)}>
        <span className="num">2</span>
        <span className="lbl">{steps.step2 === "current" ? sLabel.label : "2차 검토"}</span>
        {steps.step2 === "done" && <span className="check">✓</span>}
      </span>
      <span className="arrow">▸</span>
      <span className={stepClass(steps.step3)}>
        <span className="num">3</span>
        <span className="lbl">{steps.step3 === "current" ? sLabel.label : "3차 구매"}</span>
        {steps.step3 === "done" && <span className="check">✓</span>}
      </span>
    </div>
  );
}

export function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, reviewerCompanyIds, isAdmin } = useAuth();
  const [reviewComment, setReviewComment] = useState("");
  const [actionMsg, setActionMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState<null | "approve" | "reject" | "escalate">(null);
  const [teamReviewerAllowed, setTeamReviewerAllowed] = useState(false);

  const q = useQuery({
    queryKey: ["approval", id],
    queryFn: () => fetchApprovalBundle(id!),
    enabled: !!id,
    staleTime: 30_000,
  });

  const bundle = q.data;

  // 검토자 권한 가드 — current step 기준
  const currentStep = bundle ? getCurrentReviewStep(bundle.request.status) : null;
  const nextStatus = bundle ? getNextStatus(bundle.request.status) : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!bundle || !user || !currentStep) {
        setTeamReviewerAllowed(false);
        return;
      }
      // step 1은 회사 기반 (reviewerCompanyIds), step 2/3은 팀 기반 RPC
      if (currentStep === 1) {
        const cid = bundle.request.company_id;
        setTeamReviewerAllowed(!!cid && (isAdmin || reviewerCompanyIds.includes(cid)));
        return;
      }
      const ok = await checkTeamReviewer(user.id, bundle.request.id, currentStep);
      if (!cancelled) setTeamReviewerAllowed(ok || isAdmin);
    })();
    return () => { cancelled = true; };
  }, [bundle, user, currentStep, reviewerCompanyIds, isAdmin]);

  const isSelfRequester = !!user && !!bundle && bundle.request.requester_id === user.id;
  // admin은 본인 신청건도 검토 가능 (일반 검토자는 자기검토 차단 유지)
  const canAct = teamReviewerAllowed && (isAdmin || !isSelfRequester) && !!currentStep;
  const isV2Test = !!bundle && (bundle.request as unknown as { is_v2_test?: boolean }).is_v2_test === true;

  const handleApprove = async () => {
    if (!bundle || !user) return;
    setSubmitting("approve"); setActionMsg(null);
    const res = await approveRequest({ request: bundle.request, userId: user.id, comment: reviewComment.trim() || null });
    setSubmitting(null);
    if (!res.ok) { setActionMsg({ kind: "err", text: res.message }); return; }
    const label = res.nextStatus === "APPROVED"
      ? (res.itemCode ? `최종 승인 완료 · 품목코드 ${res.itemCode}` : "최종 승인 완료")
      : `${res.nextStatus === "PENDING_REVIEW_2" ? "2차" : "3차"} 검토로 이동`;
    setActionMsg({ kind: "ok", text: `✅ ${label}${isV2Test ? " (v2-test 격리: ERP 큐/items 미진입)" : ""}` });
    await queryClient.invalidateQueries({ queryKey: ["approval", id] });
    setTimeout(() => { if (confirm("처리 완료. 요청목록으로 이동?")) navigate("/requests"); }, 1500);
  };

  const handleReject = async () => {
    if (!bundle || !user) return;
    if (!reviewComment.trim()) { setActionMsg({ kind: "err", text: "반려 사유를 입력하세요" }); return; }
    setSubmitting("reject"); setActionMsg(null);
    const res = await rejectRequest({ request: bundle.request, userId: user.id, comment: reviewComment.trim() });
    setSubmitting(null);
    if (!res.ok) { setActionMsg({ kind: "err", text: res.message }); return; }
    setActionMsg({ kind: "ok", text: "✅ 반려 완료" });
    await queryClient.invalidateQueries({ queryKey: ["approval", id] });
    setTimeout(() => { if (confirm("반려 완료. 요청목록으로 이동?")) navigate("/requests"); }, 1500);
  };

  const handleEscalate = async () => {
    if (!bundle) return;
    if (!reviewComment.trim() || reviewComment.trim().length < 5) {
      setActionMsg({ kind: "err", text: "보완 사유를 5자 이상 입력하세요" });
      return;
    }
    setSubmitting("escalate"); setActionMsg(null);
    const res = await escalateToRequester({ request: bundle.request, comment: reviewComment.trim() });
    setSubmitting(null);
    if (!res.ok) { setActionMsg({ kind: "err", text: res.message }); return; }
    setActionMsg({ kind: "ok", text: "✅ 신청자에게 보완 요청 전달" });
    await queryClient.invalidateQueries({ queryKey: ["approval", id] });
    setTimeout(() => { if (confirm("보완 요청 완료. 요청목록으로 이동?")) navigate("/requests"); }, 1500);
  };
  const attributes = useMemo(() => {
    if (!bundle?.request.attributes) return [];
    const a = bundle.request.attributes as unknown;
    if (Array.isArray(a)) return a as Array<{ name: string; value: string; confidence?: number }>;
    if (typeof a === "object" && a !== null) {
      return Object.entries(a as Record<string, unknown>).map(([name, value]) => ({ name, value: String(value), confidence: undefined }));
    }
    return [];
  }, [bundle]);

  if (q.isLoading) {
    return (
      <section className="page-card">
        <div className="text-text-sub">로딩 중…</div>
      </section>
    );
  }
  if (q.isError || !bundle) {
    return (
      <section className="page-card">
        <div style={{ color: "#dc2626" }}>요청을 불러올 수 없습니다: {(q.error as Error)?.message}</div>
        <button className="btn-sec" onClick={() => navigate("/requests")} style={{ marginTop: 12 }}>← 요청목록으로</button>
      </section>
    );
  }

  const r = bundle.request;
  const dupRiskScore = r.duplicate_risk_score ?? 0;

  return (
    <section className="page-card">
      {/* breadcrumb + 페이지 헤더 + 검토 진행 인라인 */}
      <div className="breadcrumb">
        <a onClick={() => navigate("/requests")} style={{ cursor: "pointer" }}>요청목록</a>
        <span className="sep">›</span>
        <span>{r.request_number}</span>
        <span className="sep">›</span>
        <span>검토</span>
      </div>

      <div className="page-h">
        <div>
          <h1>
            요청목록 ▸ 검토승인 상세
          </h1>
        </div>
        <div className="actions">
          <ReviewInline bundle={bundle} />
        </div>
      </div>

      {/* 요청 정보 헤더 카드 */}
      <div className="req-header">
        <div className="meta-group">
          <span className="m-item">
            <span className="lbl">요청번호</span>
            <span className="val mono">{r.request_number}</span>
          </span>
          <span className="m-item">
            <span className="lbl">제출일</span>
            <span className="val">{fmtDate(r.created_at)}</span>
          </span>
          <span className="m-item">
            <span className="lbl">품목코드</span>
            <span className="val mono">{r.item_code || "발급 대기"}</span>
          </span>
          <span className="m-item">
            <span className="lbl">신청자</span>
            <span className="val">{bundle.requesterName || "—"}</span>
            {bundle.requesterDepartment && (
              <span className="text-xs text-gray-500">({bundle.requesterDepartment})</span>
            )}
          </span>
        </div>
      </div>

      {/* 변형 등록 배너 */}
      {r.parent_item_id && (
        <div className="variant-banner">
          <span className="b-tag">🔀 변형 등록 요청</span>
          <span>parent_item_id: <span className="mono">{r.parent_item_id}</span></span>
          <span className="text-xs" style={{ color: "#92400e", opacity: 0.7 }}>
            (승인 시 parent의 base_code 공유 + 변형코드 +1 발급)
          </span>
        </div>
      )}

      {/* 좌 2/3 + 우 1/3 */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginTop: 20 }}>

        {/* ─── 좌측 신청 정보 ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* 조직/설비 */}
          <div className="field-card">
            <div className="field-lbl">조직/설비 정보 <span className="text-xs text-gray-500 font-normal ml-2" style={{ borderBottom: 0 }}>신청자 입력</span></div>
            <div className="kv-row">
              <span className="k">법인</span>
              <span className="v">
                {bundle.companyCode && <span className="mono text-xs mr-1">{bundle.companyCode}</span>}
                · {bundle.companyName || "—"}
              </span>
            </div>
            <div className="kv-row">
              <span className="k">사업장</span>
              <span className="v">
                {bundle.siteCode && <span className="mono text-xs mr-1">[{bundle.siteCode}]</span>}
                {bundle.siteName || "—"}
              </span>
            </div>
            {bundle.businessUnitName && (
              <div className="kv-row">
                <span className="k">부문</span>
                <span className="v">{bundle.businessUnitName}</span>
              </div>
            )}
            <div className="kv-row">
              <span className="k">적용설비</span>
              <span className="v">{r.equipment_name || "—"}</span>
            </div>
            {bundle.organizations.length > 0 && (
              <div className="kv-row" style={{ gridTemplateColumns: "100px 1fr" }}>
                <span className="k">사용처</span>
                <span className="v text-xs">
                  {bundle.organizations.map((o) => `${o.companyName || "?"}/${o.siteName || "?"}/${o.equipmentName || "?"}`).join(" · ")}
                </span>
              </div>
            )}
          </div>

          {/* 품목명 */}
          <div className="field-card">
            <div className="field-lbl">품목명</div>
            <div className="kv-row" style={{ gridTemplateColumns: "120px 1fr" }}>
              <span className="k">신청 품목명 (원문)</span>
              <span className="v">{r.item_name}</span>
            </div>
            <div className="kv-row" style={{ gridTemplateColumns: "120px 1fr" }}>
              <span className="k">자동생성 표준명</span>
              <span className="v accent">
                {r.normalized_name || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>승인 시 자동 생성</span>}
              </span>
            </div>
            {r.normalized_name && (
              <div className="ai-info">
                <span>✨</span>
                <span>AI 분석: 소분류 매핑 ★속성 자동 결합</span>
              </div>
            )}
          </div>

          {/* 분류 */}
          <div className="field-card">
            <div className="field-lbl">분류</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <div className="text-xs font-medium" style={{ color: "#64748b", marginBottom: 4 }}>대분류</div>
                <input type="text" value={r.large_category || ""} readOnly />
              </div>
              <div>
                <div className="text-xs font-medium" style={{ color: "#64748b", marginBottom: 4 }}>중분류</div>
                <input type="text" value={r.medium_category || ""} readOnly />
              </div>
              <div>
                <div className="text-xs font-medium" style={{ color: "#64748b", marginBottom: 4 }}>소분류</div>
                <input type="text" value={r.small_category || ""} readOnly />
              </div>
            </div>
            {r.category_confidence != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
                <span className="text-xs" style={{ color: "#64748b" }}>AI 분류 신뢰도</span>
                {(() => {
                  const pct = Math.round((r.category_confidence ?? 0) > 1 ? r.category_confidence! : (r.category_confidence ?? 0) * 100);
                  return (
                    <>
                      <div className="conf-bar"><div className="fill" style={{ width: `${pct}%` }}></div></div>
                      <span className="text-xs font-bold" style={{ color: "#003876" }}>{pct}%</span>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* 속성 */}
          {attributes.length > 0 && (
            <div className="field-card">
              <div className="field-lbl">속성 정보 <span className="text-xs text-gray-500 font-normal ml-2" style={{ borderBottom: 0 }}>소분류 매핑 {attributes.length}슬롯</span></div>
              <table className="attr-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>속성명</th>
                    <th>값</th>
                    <th style={{ width: 90 }}>신뢰도</th>
                  </tr>
                </thead>
                <tbody>
                  {attributes.map((a, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{a.name}</td>
                      <td>{a.value || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>— 미입력</span>}</td>
                      <td>{a.confidence != null ? <span className="text-xs" style={{ color: "#16a34a", fontWeight: 700 }}>{a.confidence}%</span> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 기본 정보 */}
          <div className="field-card">
            <div className="field-lbl">기본 정보</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div className="text-xs font-medium" style={{ color: "#64748b", marginBottom: 4 }}>제조사</div>
                <input type="text" value={r.maker || ""} readOnly />
              </div>
              <div>
                <div className="text-xs font-medium" style={{ color: "#64748b", marginBottom: 4 }}>모델명</div>
                <input type="text" value={r.model || ""} className="font-mono" readOnly />
              </div>
              <div>
                <div className="text-xs font-medium" style={{ color: "#64748b", marginBottom: 4 }}>단위</div>
                <input type="text" value={r.unit || ""} readOnly />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <div className="text-xs font-medium" style={{ color: "#64748b", marginBottom: 4 }}>규격설명</div>
                <textarea rows={2} value={r.spec || ""} readOnly />
              </div>
              {r.notes && (
                <div style={{ gridColumn: "span 2" }}>
                  <div className="text-xs font-medium" style={{ color: "#64748b", marginBottom: 4 }}>참고설명</div>
                  <textarea rows={2} value={r.notes} readOnly />
                </div>
              )}
            </div>
          </div>

          {/* 중복 위험 */}
          {dupRiskScore > 0 && (
            <div className="field-card" style={{ background: "#fffbeb", borderColor: "#fbbf24" }}>
              <div className="field-lbl" style={{ color: "#92400e" }}>
                ⚠ 중복 위험
                <span className="text-xs font-normal ml-2" style={{ borderBottom: 0, color: "#a16207" }}>
                  {dupRiskScore}% · 검토 권장
                </span>
              </div>
              {r.duplicate_risk_reason && (
                <p style={{ fontSize: 13, color: "#78350f", margin: 0 }}>{r.duplicate_risk_reason}</p>
              )}
            </div>
          )}

        </div>

        {/* ─── 우측 승인 영역 (sticky) ─── */}
        <div className="approval-side" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ERP 연동 정보 */}
          <div className="field-card">
            <div className="field-lbl">ERP 연동 정보 <span className="text-xs text-gray-500 font-normal ml-2" style={{ borderBottom: 0 }}>승인 시 송신</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div className="text-xs font-medium" style={{ color: "#64748b", marginBottom: 4 }}>품목계정</div>
                <input type="text" value={r.item_account_code || ""} placeholder="—" readOnly />
              </div>
              <div>
                <div className="text-xs font-medium" style={{ color: "#64748b", marginBottom: 4 }}>품목클래스</div>
                <input type="text" value={r.item_class_code || ""} placeholder="—" readOnly />
              </div>
              <div>
                <div className="text-xs font-medium" style={{ color: "#64748b", marginBottom: 4 }}>재고단위</div>
                <input type="text" value={r.stock_unit_code || ""} placeholder="—" readOnly />
              </div>
            </div>
            {bundle.companyCode && r.small_category && (
              <div className="text-xs" style={{ color: "#1e40af", marginTop: 12, paddingTop: 10, borderTop: "1px dashed #cbd5e1" }}>
                💡 {bundle.companyCode} 회사×{r.small_category} 기본값 자동
              </div>
            )}
          </div>

          {/* 승인 의견 + 액션 */}
          <div className="field-card">
            <div className="field-lbl">검토 의견</div>
            <textarea
              rows={5}
              placeholder="승인 / 반려 / 보완 요청 사유를 입력하세요..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />
            <div className="hint" style={{ marginTop: 6 }}>반려·보완 요청 시 필수 (5자 이상)</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              <button
                className="btn-approve"
                disabled={!canAct || submitting !== null}
                onClick={handleApprove}
                title={!canAct ? (isSelfRequester ? "본인 신청건은 검토 불가" : "검토자 권한이 없습니다") : `→ ${nextStatus === "APPROVED" ? "최종 승인" : nextStatus === "PENDING_REVIEW_2" ? "2차 검토" : "3차 검토"}`}
              >
                <span>✓</span>
                <span>{submitting === "approve" ? "처리 중…" : (nextStatus === "APPROVED" ? "최종 승인" : "승인 → 다음 단계")}</span>
              </button>
              {(currentStep === 2 || currentStep === 3) && (
                <button
                  className="btn-escalate"
                  disabled={!canAct || submitting !== null}
                  onClick={handleEscalate}
                  title="신청자에게 보완 요청 (5자 이상)"
                >
                  <span>↩</span>
                  <span>{submitting === "escalate" ? "처리 중…" : "보완 요청 (신청자)"}</span>
                </button>
              )}
              <button
                className="btn-reject"
                disabled={!canAct || submitting !== null}
                onClick={handleReject}
                title={!canAct ? "검토자 권한이 없습니다" : "반려 (사유 필수)"}
              >
                <span>✕</span>
                <span>{submitting === "reject" ? "처리 중…" : "반려"}</span>
              </button>
            </div>
            {actionMsg && (
              <div className="text-xs" style={{
                marginTop: 10, padding: "8px 10px", borderRadius: 6,
                background: actionMsg.kind === "ok" ? "#ecfdf5" : "#fef2f2",
                color: actionMsg.kind === "ok" ? "#065f46" : "#991b1b",
                border: actionMsg.kind === "ok" ? "1px solid #6ee7b7" : "1px solid #fca5a5",
              }}>{actionMsg.text}</div>
            )}
            {!canAct && (
              <div className="text-xs" style={{ color: "#94a3b8", marginTop: 10, textAlign: "center" }}>
                ⓘ {isSelfRequester ? "본인 신청건 (검토 불가)"
                   : !currentStep ? "이미 처리 완료된 요청"
                   : !teamReviewerAllowed ? `${currentStep}차 검토자 권한 없음`
                   : "권한 확인 중…"}
              </div>
            )}
            {canAct && isV2Test && (
              <div className="text-xs" style={{ color: "#7c3aed", marginTop: 10, textAlign: "center", fontWeight: 600 }}>
                🆕 v2-test 격리 행 · 승인 시 ERP/items 미진입
              </div>
            )}
          </div>

          {/* 최근 활동 */}
          <div className="field-card" style={{ padding: "14px 16px" }}>
            <div className="field-lbl" style={{ fontSize: 13, marginBottom: 8 }}>최근 활동</div>
            <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>
              <div>📅 <b>{fmtDate(r.created_at)}</b> · {bundle.requesterName || "신청자"} 신청 제출</div>
              {r.review_1_at && <div>📅 <b>{fmtDate(r.review_1_at)}</b> · 1차 처리</div>}
              {r.review_2_at && <div>📅 <b>{fmtDate(r.review_2_at)}</b> · 2차 처리</div>}
              {r.review_3_at && <div>📅 <b>{fmtDate(r.review_3_at)}</b> · 3차 처리</div>}
              {r.updated_at && r.updated_at !== r.created_at && (
                <div>📅 <b>{fmtDate(r.updated_at)}</b> · 최종 갱신</div>
              )}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
