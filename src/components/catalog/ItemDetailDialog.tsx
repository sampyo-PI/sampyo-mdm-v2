import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { Fragment, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchItemDetail,
  fetchActiveCompanies,
  fetchCompanyAccounts,
  fetchItemClasses,
  distributeToCompany,
  setItemCompanyActive,
  type LinkedCompany,
  type AttributeSlot,
} from "../../lib/itemDetailQueries";
import { requestDistribution, fetchMyPendingRequest } from "../../lib/distributionRequests";
import { asAttrArray, formatYyMm } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import type { ItemRow } from "../../lib/catalogQueries";

type Props = {
  item: ItemRow | null;
  open: boolean;
  onClose: () => void;
};

const SOURCE_BADGE: Record<string, { cls: string; label: string }> = {
  mdm: { cls: "b-blue", label: "신규" },
  legacy: { cls: "b-draft", label: "기존" },
  bulk_upload: { cls: "b-warn", label: "업로드" },
};

const IC_SOURCE_LABEL: Record<string, string> = {
  upload: "업로드",
  legacy: "기존",
  distribute: "배포",
  erp_backfill: "역이관",
  manual: "수동",
};

function CompanyChip({ c }: { c: LinkedCompany }) {
  const off = c.ic_is_active === false || !c.is_active;
  return (
    <span
      className={`company-chip${off ? " off" : ""}`}
      title={`${c.code} · ${c.name} · ${c.source ?? "?"} · ${c.added_at?.slice(0, 10)}`}
    >
      <span className="code">{c.code}</span>
      <span>{c.name}</span>
      {off && <span style={{ color: "#9ca3af", fontSize: 11 }}> · OFF</span>}
    </span>
  );
}

function AttrSlotRow({ slot }: { slot: AttributeSlot }) {
  const empty = !slot.value || slot.value === "-" || slot.value === "0";
  return (
    <div className="attr-slot">
      <div className="idx">{slot.sort_order}</div>
      <div className="name">
        {slot.name}
        {slot.include_in_name && <span className="star">★</span>}
      </div>
      <div className={`val${empty ? " empty" : ""}`}>{empty ? "—" : slot.value}</div>
    </div>
  );
}

function ExtraAttrRow({ name, value }: { name: string; value: string }) {
  return (
    <div className="attr-slot">
      <div className="idx">+</div>
      <div className="name">{name}</div>
      <div className="val">{value}</div>
    </div>
  );
}

export function ItemDetailDialog({ item, open, onClose }: Props) {
  const { isAdmin, profile } = useAuth();
  const qc = useQueryClient();
  const myCompanyId = profile?.company_id ?? null;
  const q = useQuery({
    queryKey: ["item-detail", item?.id],
    queryFn: () => fetchItemDetail(item!),
    enabled: !!item && open,
    staleTime: 60_000,
  });

  // ── 법인 추가 배포 (법인 + 품목계정 + 품목클래스) ──
  const [dCompanyCode, setDCompanyCode] = useState("");
  const [dAccount, setDAccount] = useState("");
  const [dClass, setDClass] = useState("");
  const [dMsg, setDMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const companiesQ = useQuery({
    queryKey: ["active-companies"],
    queryFn: fetchActiveCompanies,
    enabled: open && isAdmin,
    staleTime: 300_000,
  });
  const accountsQ = useQuery({
    queryKey: ["company-accounts", dCompanyCode],
    queryFn: () => fetchCompanyAccounts(dCompanyCode),
    enabled: open && isAdmin && !!dCompanyCode,
    staleTime: 120_000,
  });
  const classesQ = useQuery({
    queryKey: ["item-classes"],
    queryFn: fetchItemClasses,
    enabled: open && isAdmin,
    staleTime: 300_000,
  });

  const distributeMut = useMutation({
    mutationFn: () =>
      distributeToCompany({
        itemCode: item!.item_code,
        companyCode: dCompanyCode,
        accountCode: dAccount || null,
        classCode: dClass || null,
      }),
    onSuccess: (res) => {
      if (res?.error) {
        setDMsg({ ok: false, text: res.error });
        return;
      }
      setDMsg({ ok: true, text: res?.erp_skipped ? `배포 완료 (${res.reason})` : "배포 완료 — ERP 전송 대기" });
      setDCompanyCode("");
      setDAccount("");
      setDClass("");
      qc.invalidateQueries({ queryKey: ["item-detail", item?.id] });
    },
    onError: (e) => setDMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }),
  });

  const toggleActiveMut = useMutation({
    mutationFn: (v: { companyId: string; active: boolean }) =>
      setItemCompanyActive(item!.id, v.companyId, v.active),
    onSuccess: (res) => {
      if (res?.error) { setDMsg({ ok: false, text: res.error }); return; }
      setDMsg({ ok: true, text: "배포 상태 변경 완료" });
      qc.invalidateQueries({ queryKey: ["item-detail", item?.id] });
    },
    onError: (e) => setDMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }),
  });

  // ── 비관리자: 우리 법인 배포 요청 ──
  const myDeployed = !!q.data?.linkedCompanies.some(
    (c) => c.id === myCompanyId && c.is_active && c.ic_is_active !== false,
  );
  const pendingReqQ = useQuery({
    queryKey: ["my-dist-req", item?.id, myCompanyId],
    queryFn: () => fetchMyPendingRequest(item!.id, myCompanyId!),
    enabled: open && !isAdmin && !!item?.id && !!myCompanyId && !!q.data && !myDeployed,
    staleTime: 30_000,
  });
  const [reqNote, setReqNote] = useState("");
  const requestMut = useMutation({
    mutationFn: () => requestDistribution(item!.item_code, reqNote || null),
    onSuccess: (res) => {
      if (res?.error) { setDMsg({ ok: false, text: res.error }); return; }
      setDMsg({ ok: true, text: "배포 요청이 접수되었습니다 (검토 대기)" });
      setReqNote("");
      qc.invalidateQueries({ queryKey: ["my-dist-req", item?.id, myCompanyId] });
    },
    onError: (e) => setDMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }),
  });

  const sourceBadge = item?.source ? SOURCE_BADGE[item.source] : null;
  const fullCategory = [item?.large_category, item?.medium_category, item?.small_category]
    .filter(Boolean)
    .join(" ▸ ");

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-[300]">
        {/* Backdrop — Tailwind 직접 작성 (sds.css .modal-backdrop는 fixed/z-index 충돌) */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 z-[300]"
            style={{ background: "rgba(15,23,42,0.55)" }}
            aria-hidden="true"
          />
        </TransitionChild>

        {/* 모달 컨테이너 — items-start + outer scroll로 상단 잘림 방지 */}
        <div className="fixed inset-0 z-[301] overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="modal detail">
              {/* ── 모달 헤더 (4줄 동일 폰트) ── */}
              <div className="modal-h">
                <div className="head-left">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className="item-code">{item?.item_code_display || item?.item_code || "-"}</span>
                    {sourceBadge && (
                      <span className={`badge ${sourceBadge.cls}`}>
                        {formatYyMm(item?.created_at)} {sourceBadge.label}
                      </span>
                    )}
                    {item?.is_active ? (
                      <span className="badge b-approve">활성</span>
                    ) : (
                      <span className="badge b-error">REVOKED</span>
                    )}
                  </div>
                  <div className="item-name">{item?.normalized_name || item?.item_name || ""}</div>
                  <div className="head-meta">
                    <span>{fullCategory || "—"}</span>
                  </div>
                  <div className="head-meta">
                    <span>최종수정 {item?.updated_at?.slice(0, 10) || "—"}</span>
                  </div>
                </div>
                <div className="head-actions">
                  <button className="btn-ghost" title="QR 인쇄" disabled>🔗 QR</button>
                  <button className="btn-ghost" title="변경 이력" disabled>📜 이력</button>
                  <button className="btn-sec" disabled>변형 등록</button>
                  <button className="btn-pri" disabled>✏ 수정</button>
                  <button className="close" onClick={onClose} title="닫기 (Esc)" aria-label="닫기">
                    ×
                  </button>
                </div>
              </div>

              {/* ── 모달 본문 ── */}
              <div className="modal-body">
                {q.isLoading && <div className="text-text-sub">로딩 중…</div>}
                {q.isError && <div style={{ color: "#dc2626" }}>오류: {(q.error as Error).message}</div>}
                {q.data && (
                  <>
                    {/* 1. 기본 정보 */}
                    <div className="form-group">
                      <div className="fg-title">기본 정보</div>
                      <div className="kv-grid">
                        <div className="kv-row"><div className="k">품목명</div><div className="v">{item?.item_name || "—"}</div></div>
                        <div className="kv-row"><div className="k">표준명</div><div className="v">{item?.normalized_name || "—"}</div></div>
                        <div className="kv-row"><div className="k">제조사</div><div className="v">{item?.maker || "—"}</div></div>
                        <div className="kv-row"><div className="k">모델</div><div className="v mono">{item?.model || "—"}</div></div>
                        <div className="kv-row"><div className="k">규격</div><div className="v mono">{item?.spec || "—"}</div></div>
                        <div className="kv-row"><div className="k">재고단위</div><div className="v mono">{item?.stock_unit_code || "—"}</div></div>
                        <div className="kv-row"><div className="k">설비</div><div className="v">{item?.equipment || "—"}</div></div>
                        <div className="kv-row"><div className="k">기존품목코드</div><div className="v mono">{item?.legacy_code || "—"}</div></div>
                      </div>
                    </div>

                    {/* 2. 속성 — 2열 (정의 / 추가) */}
                    <div className="form-group">
                      <div className="fg-title">
                        속성
                        <span className="text-xs text-gray-500 font-normal ml-2" style={{ borderBottom: 0 }}>
                          {q.data.attributeSlots.filter((s) => s.value).length} /{" "}
                          {q.data.attributeSlots.length} 채움 · ★ 표준명 포함
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                        {/* 좌: 정의된 속성 슬롯 */}
                        <div>
                          <div className="text-xs text-gray-500 mb-1">
                            정의 속성 ({q.data.attributeSlots.length})
                          </div>
                          {q.data.attributeSlots.length === 0 ? (
                            <div className="text-text-sub italic">소분류 매핑 없음</div>
                          ) : (
                            q.data.attributeSlots.map((s) => <AttrSlotRow key={s.sort_order} slot={s} />)
                          )}
                        </div>
                        {/* 우: 추가 속성 (5 슬롯 외) */}
                        <div style={{ borderLeft: "1px dashed #e5e7eb", paddingLeft: 18 }}>
                          {(() => {
                            const slotNames = new Set(q.data.attributeSlots.map((s) => s.name.trim()));
                            const extras = asAttrArray(item?.attributes).filter(
                              (a) => a.value && !slotNames.has(a.name.trim()),
                            );
                            if (extras.length === 0) {
                              return (
                                <>
                                  <div className="text-xs text-gray-500 mb-1">추가 속성</div>
                                  <div className="text-text-sub italic">없음</div>
                                </>
                              );
                            }
                            return (
                              <>
                                <div className="text-xs text-gray-500 mb-1">
                                  추가 속성 ({extras.length}건)
                                </div>
                                {extras.map((a, i) => (
                                  <ExtraAttrRow key={i} name={a.name} value={a.value} />
                                ))}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* 3. 사용 법인 */}
                    <div className="form-group">
                      <div className="fg-title">
                        사용 법인
                        <span className="text-xs text-gray-500 font-normal ml-2" style={{ borderBottom: 0 }}>
                          {q.data.linkedCompanies.length}개
                        </span>
                      </div>
                      {q.data.linkedCompanies.length === 0 ? (
                        <div className="text-text-sub italic">매핑 없음</div>
                      ) : (
                        <div style={{ marginBottom: 4 }}>
                          {q.data.linkedCompanies.map((c) => (
                            <CompanyChip key={`${c.id}-${c.site_id ?? ""}-${c.equipment_name ?? ""}`} c={c} />
                          ))}
                        </div>
                      )}
                      {/* 상세 그리드 (선택) — chip 요약만으로 충분하면 생략 가능 */}
                      {q.data.linkedCompanies.length > 0 && (
                        <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ background: "#f1f5f9", color: "#003876" }}>
                              <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600 }}>코드</th>
                              <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600 }}>법인명</th>
                              <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600 }}>등록방식</th>
                              <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600 }}>등록일</th>
                              <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600 }}>품목계정</th>
                              <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600 }}>품목클래스</th>
                              <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600 }}>재고단위</th>
                              <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600 }}>상태</th>
                              <th style={{ padding: "6px 10px", textAlign: "center", fontWeight: 600 }}>관리</th>
                            </tr>
                          </thead>
                          <tbody>
                            {q.data.linkedCompanies.map((c) => {
                              const off = c.ic_is_active === false || !c.is_active;
                              return (
                                <tr key={c.id} style={{ borderBottom: "1px solid #f1f3f6", color: "#003876" }}>
                                  <td style={{ padding: "6px 10px", fontFamily: "ui-monospace,monospace", fontWeight: 600 }}>{c.code}</td>
                                  <td style={{ padding: "6px 10px" }}>{c.name}</td>
                                  <td style={{ padding: "6px 10px" }}>
                                    <span className="badge b-blue">{IC_SOURCE_LABEL[c.source ?? ""] ?? c.source ?? "-"}</span>
                                  </td>
                                  <td style={{ padding: "6px 10px", fontFamily: "ui-monospace,monospace" }}>{c.added_at?.slice(0, 10)}</td>
                                  <td style={{ padding: "6px 10px", fontFamily: "ui-monospace,monospace" }}>{c.item_account_code || "—"}</td>
                                  <td style={{ padding: "6px 10px", fontFamily: "ui-monospace,monospace" }}>{c.item_class_code || "—"}</td>
                                  <td style={{ padding: "6px 10px", fontFamily: "ui-monospace,monospace" }}>{c.stock_unit_code || "—"}</td>
                                  <td style={{ padding: "6px 10px" }}>
                                    {off ? (
                                      <span className="badge b-future">비활성</span>
                                    ) : (
                                      <span className="badge b-approve">활성</span>
                                    )}
                                  </td>
                                  <td style={{ padding: "6px 10px", textAlign: "center" }}>
                                    {isAdmin && (
                                      off ? (
                                        <button className="btn-ghost" style={{ padding: "2px 8px", fontSize: 12 }}
                                          disabled={toggleActiveMut.isPending}
                                          onClick={() => toggleActiveMut.mutate({ companyId: c.id, active: true })}>복원</button>
                                      ) : (
                                        <button className="btn-ghost" style={{ padding: "2px 8px", fontSize: 12, color: "#dc2626" }}
                                          disabled={toggleActiveMut.isPending}
                                          onClick={() => { if (window.confirm(`${c.name} 법인 배포를 해제할까요? (ERP REVOKE 큐 생성)`)) toggleActiveMut.mutate({ companyId: c.id, active: false }); }}>해제</button>
                                      )
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}

                      {/* 법인 추가 배포 (A-1: 법인 + 사업장 + 설비) — admin */}
                      {isAdmin && (
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--c-border)" }}>
                          <div className="text-xs" style={{ fontWeight: 600, color: "var(--c-navy-600)", marginBottom: 8 }}>법인 추가 배포</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <select className="dist-input" value={dCompanyCode} onChange={(e) => { setDCompanyCode(e.target.value); setDAccount(""); setDMsg(null); }}>
                              <option value="">법인 선택…</option>
                              {(companiesQ.data ?? []).map((c) => <option key={c.id} value={c.code}>[{c.code}] {c.name}</option>)}
                            </select>
                            <select className="dist-input" value={dAccount} onChange={(e) => setDAccount(e.target.value)} disabled={!dCompanyCode}>
                              <option value="">품목계정 (기본값)</option>
                              {(accountsQ.data ?? []).map((a) => <option key={a.account_code} value={a.account_code}>[{a.account_code}] {a.account_name}</option>)}
                            </select>
                            <select className="dist-input" value={dClass} onChange={(e) => setDClass(e.target.value)} disabled={!dCompanyCode}>
                              <option value="">품목클래스 (기본값)</option>
                              {(classesQ.data ?? []).map((c) => <option key={c.class_code} value={c.class_code}>[{c.class_code}] {c.class_name}</option>)}
                            </select>
                            <button className="btn-pri" disabled={!dCompanyCode || distributeMut.isPending} onClick={() => distributeMut.mutate()}>
                              {distributeMut.isPending ? "배포 중…" : "배포"}
                            </button>
                          </div>
                          {dMsg && <div style={{ marginTop: 8, fontSize: 13, color: dMsg.ok ? "#16a34a" : "#dc2626" }}>{dMsg.text}</div>}
                          <div className="text-xs text-gray-500" style={{ marginTop: 6 }}>
                            품목계정·품목클래스 미선택 시 법인별 기본 매핑이 적용됩니다. 배포 시 해당 법인 ERP로 전송됩니다.
                          </div>
                          <style>{`.dist-input{border:1px solid var(--c-border);border-radius:6px;padding:7px 10px;font-size:var(--app-fs-md);color:var(--c-text);background:#fff;}`}</style>
                        </div>
                      )}

                      {/* 비관리자: 우리 법인 배포 요청 */}
                      {!isAdmin && myCompanyId && q.data && !myDeployed && (
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--c-border)" }}>
                          <div className="text-xs" style={{ fontWeight: 600, color: "var(--c-navy-600)", marginBottom: 8 }}>우리 법인 배포</div>
                          {pendingReqQ.data ? (
                            <span className="badge b-warn">요청됨 · 검토 중</span>
                          ) : (
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <input style={{ flex: 1, minWidth: 200, border: "1px solid var(--c-border)", borderRadius: 6, padding: "7px 10px", fontSize: "var(--app-fs-md)" }}
                                placeholder="요청 사유 (선택)" value={reqNote} onChange={(e) => setReqNote(e.target.value)} />
                              <button className="btn-pri" disabled={requestMut.isPending} onClick={() => requestMut.mutate()}>
                                {requestMut.isPending ? "요청 중…" : "우리 법인 배포 요청"}
                              </button>
                            </div>
                          )}
                          {dMsg && <div style={{ marginTop: 8, fontSize: 13, color: dMsg.ok ? "#16a34a" : "#dc2626" }}>{dMsg.text}</div>}
                          <div className="text-xs text-gray-500" style={{ marginTop: 6 }}>관리자 또는 해당 법인 3차 검토자가 승인하면 배포됩니다.</div>
                        </div>
                      )}
                    </div>

                    {/* 4. 첨부파일 (placeholder) */}
                    <div className="form-group">
                      <div className="fg-title">
                        첨부파일
                        <span className="text-xs text-gray-500 font-normal ml-2" style={{ borderBottom: 0 }}>
                          (Phase 2)
                        </span>
                      </div>
                      <div className="text-text-sub italic">첨부파일 기능 준비 중</div>
                    </div>

                    {/* 5. 이력 */}
                    <div className="form-group">
                      <div className="fg-title">이력</div>
                      <div className="timeline-row">
                        <span className="ts">{item?.created_at?.slice(0, 19).replace("T", " ") || "—"}</span>
                        <span className="actor">시스템</span>
                        <span className="desc">
                          등록 (source: {item?.source ?? "—"}
                          {q.data.batch && (
                            <>
                              {", batch: "}
                              <span style={{ fontFamily: "ui-monospace,monospace", color: "var(--c-accent-500)" }}>
                                {q.data.batch.id.slice(0, 8)}
                              </span>
                              {q.data.batch.display_label && <> · {q.data.batch.display_label}</>}
                            </>
                          )}
                          )
                        </span>
                      </div>
                      {item?.updated_at && item.updated_at !== item.created_at && (
                        <div className="timeline-row">
                          <span className="ts">{item.updated_at.slice(0, 19).replace("T", " ")}</span>
                          <span className="actor">시스템</span>
                          <span className="desc">최종 수정 (UPDATE)</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* ── 모달 푸터 ── */}
              <div className="modal-f">
                <button className="btn-danger" style={{ marginRight: "auto" }} disabled>
                  ⊘ 폐기 (REVOKE)
                </button>
                <button className="btn-sec" onClick={onClose}>닫기</button>
                <button className="btn-pri" disabled>✏ 수정으로 이동</button>
              </div>
            </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
