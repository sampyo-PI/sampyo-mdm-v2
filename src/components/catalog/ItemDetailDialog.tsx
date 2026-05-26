import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchItemDetail, type LinkedCompany, type AttributeSlot } from "../../lib/itemDetailQueries";
import { asAttrArray, formatYyMm } from "../../lib/utils";
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
  const q = useQuery({
    queryKey: ["item-detail", item?.id],
    queryFn: () => fetchItemDetail(item!),
    enabled: !!item && open,
    staleTime: 60_000,
  });

  const sourceBadge = item?.source ? SOURCE_BADGE[item.source] : null;
  const fullCategory = [item?.large_category, item?.medium_category, item?.small_category]
    .filter(Boolean)
    .join(" ▸ ");

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="modal-backdrop open" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                            <CompanyChip key={c.id} c={c} />
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
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
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
      </Dialog>
    </Transition>
  );
}
