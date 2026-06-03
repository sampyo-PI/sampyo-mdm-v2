import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rest, rpc } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

// ─── 타입 ───────────────────────────────────────────────
interface Company {
  id: string;
  code: string;
  name: string;
  series_id: string | null;
  sort_order: number | null;
}
interface CompanySeries {
  id: string;
  code: string;
  name: string;
  display_order: number;
}
interface Department {
  department: string;
  member_count: number;
}
interface DRRow {
  id?: string;
  company_id: string | null;
  series_id: string | null;
  reviewer_2_teams: string[];
  reviewer_3_teams: string[];
  ai_review_enabled: boolean;
  is_fallback: boolean;
  note?: string | null;
}

type RowVariant = "series" | "company" | "fallback";

const FALLBACK_KEY = "__fallback__";
const SERIES_PREFIX = "series:";
const COMPANY_PREFIX = "company:";

const QK = ["admin-reviewers"] as const;

// ─── 데이터 로드 ────────────────────────────────────────
type LoadResult = {
  companies: Company[];
  seriesList: CompanySeries[];
  departments: Department[];
  base: Record<string, DRRow>;
};

async function loadAll(): Promise<LoadResult> {
  const [companies, seriesList, departments, dr] = await Promise.all([
    rest<Company[]>("GET", "companies", {
      params: { select: "id,code,name,series_id,sort_order", order: "sort_order.asc" },
    }),
    rest<CompanySeries[]>("GET", "company_series", {
      params: { select: "id,code,name,display_order", order: "display_order.asc" },
    }),
    rpc<Department[]>("get_distinct_departments"),
    rest<DRRow[]>("GET", "default_reviewers", { params: { select: "*" } }),
  ]);

  const map: Record<string, DRRow> = {};

  map[FALLBACK_KEY] = {
    company_id: null,
    series_id: null,
    reviewer_2_teams: [],
    reviewer_3_teams: [],
    ai_review_enabled: false,
    is_fallback: true,
  };

  for (const s of seriesList) {
    map[SERIES_PREFIX + s.id] = {
      company_id: null,
      series_id: s.id,
      reviewer_2_teams: [],
      reviewer_3_teams: [],
      ai_review_enabled: false,
      is_fallback: false,
    };
  }

  for (const c of companies) {
    map[COMPANY_PREFIX + c.id] = {
      company_id: c.id,
      series_id: null,
      reviewer_2_teams: [],
      reviewer_3_teams: [],
      ai_review_enabled: false,
      is_fallback: false,
    };
  }

  for (const r of dr ?? []) {
    let key: string;
    if (r.is_fallback) key = FALLBACK_KEY;
    else if (r.series_id) key = SERIES_PREFIX + r.series_id;
    else if (r.company_id) key = COMPANY_PREFIX + r.company_id;
    else continue;

    map[key] = {
      ...map[key],
      ...r,
      reviewer_2_teams: r.reviewer_2_teams ?? [],
      reviewer_3_teams: r.reviewer_3_teams ?? [],
    };
  }

  return { companies, seriesList, departments, base: map };
}

// ─── TeamPicker (부서명 다중선택 chip + 회사 prefix amber 경고) ───
function TeamPicker({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  options: Department[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const optionNames = useMemo(() => new Set(options.map((o) => o.department)), [options]);

  const toggle = (name: string) => {
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);
  };
  const addCustom = () => {
    const t = draft.trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setDraft("");
  };

  const customSelected = value.filter((v) => !optionNames.has(v));

  const t = draft.trim();
  const prefixSuspect = t && !optionNames.has(t)
    ? options.find((o) => t.endsWith(" " + o.department) && t !== o.department)
    : undefined;
  const similar = t && !optionNames.has(t) && !prefixSuspect
    ? options
        .filter((o) => o.department.includes(t) || (t.length >= 2 && t.includes(o.department)))
        .slice(0, 3)
    : [];

  return (
    <div className="tp" ref={wrapRef}>
      <div className="team-picker" onClick={() => setOpen(true)}>
        {value.length === 0 && <span className="placeholder">{placeholder}</span>}
        {value.map((v) => (
          <span key={v} className="chip">
            {v}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((x) => x !== v));
              }}
              aria-label={`${v} 제거`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          placeholder={value.length === 0 ? "" : "팀 추가…"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
        />
      </div>

      {open && (
        <>
          <div className="tp-backdrop" onClick={() => setOpen(false)} />
          <div className="tp-pop">
            {customSelected.length > 0 && (
              <>
                <div className="tp-head">직접 추가 ({customSelected.length}개)</div>
                <div className="tp-list">
                  {customSelected.map((name) => (
                    <label key={name} className="tp-opt">
                      <input type="checkbox" checked onChange={() => toggle(name)} />
                      <span className="tp-opt-name">{name}</span>
                      <span className="tp-tag">사용자추가</span>
                    </label>
                  ))}
                </div>
                <div className="tp-divider" />
              </>
            )}
            <div className="tp-head">기존 부서 ({options.length}개)</div>
            <div className="tp-list tp-scroll">
              {options.map((d) => (
                <label key={d.department} className="tp-opt">
                  <input
                    type="checkbox"
                    checked={value.includes(d.department)}
                    onChange={() => toggle(d.department)}
                  />
                  <span className="tp-opt-name">{d.department}</span>
                  <span className="tp-cnt">{d.member_count}명</span>
                </label>
              ))}
            </div>

            <div className="tp-add">
              <input
                placeholder="신규 부서명 추가"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustom()}
              />
              <button type="button" onClick={addCustom}>
                추가
              </button>
            </div>

            {prefixSuspect && (
              <div className="tp-warn">
                <div className="tp-warn-t">⚠ 회사명 prefix가 포함된 것으로 보입니다</div>
                <div className="tp-warn-d">
                  profiles.department는 HR OAuth로 단순 부서명만 채워집니다. prefix 포함 시 권한 매칭이
                  깨집니다.
                </div>
                <button type="button" className="tp-warn-fix" onClick={() => setDraft(prefixSuspect.department)}>
                  "{prefixSuspect.department}"로 정정
                </button>
              </div>
            )}
            {!prefixSuspect && similar.length > 0 && (
              <div className="tp-similar">비슷한 기존 부서: {similar.map((s) => s.department).join(", ")}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── AI 토글 ────────────────────────────────────────────
function AIToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <div className={`toggle ${on ? "on" : ""}`} onClick={onClick}>
      <div className="sw" />
      <span className="lbl">{on ? "ON" : "OFF"}</span>
    </div>
  );
}

// ─── 본문 ───────────────────────────────────────────────
export function AdminReviewersPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: QK,
    queryFn: loadAll,
    staleTime: 30_000,
    enabled: isAdmin,
  });

  // 로컬 편집 상태 (서버 base 위에 덮어쓰기)
  const [edits, setEdits] = useState<Record<string, DRRow>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [showAllOverrides, setShowAllOverrides] = useState(false);

  const companies = data?.companies ?? [];
  const seriesList = data?.seriesList ?? [];
  const departments = data?.departments ?? [];
  const base = data?.base ?? {};

  // 현재 행 = 편집본 우선, 없으면 서버 base
  const rowOf = (key: string): DRRow | undefined => edits[key] ?? base[key];

  const updateField = (key: string, patch: Partial<DRRow>) => {
    const cur = rowOf(key);
    if (!cur) return;
    setEdits((prev) => ({ ...prev, [key]: { ...cur, ...patch } }));
    setDirty((prev) => new Set(prev).add(key));
  };

  // ── 저장 mutation ──
  const saveMut = useMutation({
    mutationFn: async (key: string) => {
      const r = rowOf(key);
      if (!r) throw new Error("행 없음");
      const body = {
        company_id: r.company_id,
        series_id: r.series_id,
        reviewer_2_teams: r.reviewer_2_teams,
        reviewer_3_teams: r.reviewer_3_teams,
        ai_review_enabled: r.ai_review_enabled,
        is_fallback: r.is_fallback,
        note: r.note ?? null,
      };
      if (r.id) {
        await rest("PATCH", "default_reviewers", {
          params: { id: `eq.${r.id}` },
          body,
          prefer: "return=representation",
        });
      } else {
        await rest("POST", "default_reviewers", {
          body,
          prefer: "return=representation",
        });
      }
    },
    onMutate: (key) => setSavingKey(key),
    onSettled: () => setSavingKey(null),
    onSuccess: (_d, key) => {
      setDirty((prev) => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
      setEdits((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
      void qc.invalidateQueries({ queryKey: QK });
    },
    onError: (e) => alert(`저장 실패: ${(e as Error).message}`),
  });

  // ── override 삭제 mutation ──
  const deleteMut = useMutation({
    mutationFn: async (key: string) => {
      const r = rowOf(key);
      if (!r?.id) throw new Error("삭제할 override가 없습니다");
      await rest("DELETE", "default_reviewers", { params: { id: `eq.${r.id}` } });
    },
    onSuccess: (_d, key) => {
      setDirty((prev) => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
      setEdits((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
      void qc.invalidateQueries({ queryKey: QK });
    },
    onError: (e) => alert(`삭제 실패: ${(e as Error).message}`),
  });

  const onDelete = (key: string) => {
    const r = rowOf(key);
    if (!r?.id) return;
    if (
      !window.confirm(
        "이 법인 override를 삭제하시겠습니까?\n삭제 후에는 자동으로 계열/전사 폴백이 사용됩니다.",
      )
    )
      return;
    deleteMut.mutate(key);
  };

  const cancelAll = () => {
    setEdits({});
    setDirty(new Set());
  };

  // ── 파생값 ──
  const seriesNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of seriesList) m[s.id] = s.name;
    return m;
  }, [seriesList]);

  const filteredCompanies = useMemo(
    () =>
      companies.filter(
        (c) => !filter || c.name.includes(filter) || c.code.toLowerCase().includes(filter.toLowerCase()),
      ),
    [companies, filter],
  );

  const hasOverride = (companyId: string) => Boolean(rowOf(COMPANY_PREFIX + companyId)?.id);

  const visibleOverrides = useMemo(() => {
    if (showAllOverrides || filter) return filteredCompanies;
    return filteredCompanies.filter((c) => hasOverride(c.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCompanies, showAllOverrides, filter, edits, base]);

  const stats = useMemo(() => {
    const hasTeam = (r?: DRRow) =>
      (r?.reviewer_2_teams.length ?? 0) > 0 || (r?.reviewer_3_teams.length ?? 0) > 0;
    const seriesConfigured = seriesList.filter((s) => {
      const r = rowOf(SERIES_PREFIX + s.id);
      return r?.id && hasTeam(r);
    }).length;
    const overrideCount = companies.filter((c) => hasOverride(c.id)).length;
    const allKeys = [
      FALLBACK_KEY,
      ...seriesList.map((s) => SERIES_PREFIX + s.id),
      ...companies.map((c) => COMPANY_PREFIX + c.id),
    ];
    const aiOn = allKeys.filter((k) => {
      const r = rowOf(k);
      return r?.id && r.ai_review_enabled;
    }).length;
    const fb = rowOf(FALLBACK_KEY);
    const fbOk = Boolean(fb?.id) && hasTeam(fb);
    const orphanCompanies = companies.filter((c) => !c.series_id && !hasOverride(c.id)).length;
    return { seriesConfigured, overrideCount, aiOn, fbOk, orphanCompanies };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesList, companies, edits, base]);

  const getEffectiveStatus = (
    key: string,
    variant: RowVariant,
  ): { label: string; tone: "ok" | "warn" | "fallback" | "danger" } => {
    const r = rowOf(key);
    const hasTeam = (r?.reviewer_2_teams.length ?? 0) > 0 || (r?.reviewer_3_teams.length ?? 0) > 0;
    if (r?.id && hasTeam) return { label: "구성됨", tone: "ok" };

    if (variant === "company") {
      const c = companies.find((cc) => COMPANY_PREFIX + cc.id === key);
      if (c?.series_id) {
        const sr = rowOf(SERIES_PREFIX + c.series_id);
        const sHasTeam =
          (sr?.reviewer_2_teams.length ?? 0) > 0 || (sr?.reviewer_3_teams.length ?? 0) > 0;
        if (sr?.id && sHasTeam) return { label: "계열 폴백 사용", tone: "fallback" };
      }
      return { label: "전사 폴백 사용", tone: "warn" };
    }
    if (variant === "series") return { label: "전사 폴백 사용", tone: "warn" };
    return { label: "미설정 (위험)", tone: "danger" };
  };

  // ── 행 렌더 ──
  const renderRow = (
    key: string,
    variant: RowVariant,
    label: React.ReactNode,
    sublabel?: React.ReactNode,
  ) => {
    const r = rowOf(key);
    if (!r) return null;
    const eff = getEffectiveStatus(key, variant);
    const isDirty = dirty.has(key);
    const cls =
      eff.tone === "ok"
        ? "status-ok"
        : eff.tone === "warn"
          ? "status-warn"
          : eff.tone === "fallback"
            ? "status-fallback"
            : "status-danger";

    return (
      <tr key={key} className={isDirty ? "dirty" : ""}>
        <td>
          <div className="target-name">{label}</div>
          {sublabel && <div className="target-sublabel">{sublabel}</div>}
          <div className="target-status">
            <span className={`badge ${cls}`}>{eff.label}</span>
            {isDirty && <span className="badge dirty">수정됨</span>}
          </div>
        </td>
        <td>
          <TeamPicker
            value={r.reviewer_2_teams}
            onChange={(v) => updateField(key, { reviewer_2_teams: v })}
            options={departments}
            placeholder="2차 팀 선택 (생산/설비)"
          />
        </td>
        <td>
          <TeamPicker
            value={r.reviewer_3_teams}
            onChange={(v) => updateField(key, { reviewer_3_teams: v })}
            options={departments}
            placeholder="3차 팀 선택 (구매)"
          />
        </td>
        <td>
          <AIToggle on={r.ai_review_enabled} onClick={() => updateField(key, { ai_review_enabled: !r.ai_review_enabled })} />
        </td>
        <td>
          <div className="row-acts">
            <button
              className={isDirty ? "save-on" : ""}
              disabled={!isDirty || savingKey === key}
              onClick={() => saveMut.mutate(key)}
              title={isDirty ? "변경사항 저장" : "변경 없음"}
            >
              {savingKey === key ? "저장 중…" : isDirty ? "💾 저장" : "저장"}
            </button>
            {variant === "company" && r.id && (
              <button
                className="del"
                title="override 삭제 → 계열 폴백으로 복귀"
                disabled={deleteMut.isPending}
                onClick={() => onDelete(key)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const tableHead = (
    <thead>
      <tr>
        <th style={{ width: 280 }}>대상 / 상태</th>
        <th>2차 검토팀 (생산/설비)</th>
        <th>3차 검토팀 (구매)</th>
        <th style={{ width: 90 }}>AI 1차</th>
        <th style={{ width: 130, textAlign: "right" }}>동작</th>
      </tr>
    </thead>
  );

  // ── 권한 게이트 ──
  if (!isAdmin) {
    return (
      <section className="page-card">
        <style>{PAGE_STYLES}</style>
        <div className="page-h">
          <div>
            <h1>
              검토자 설정
              <span className="text-xs text-gray-500 font-normal ml-2">/ admin/reviewers</span>
            </h1>
            <div className="meta">관리자 전용 페이지</div>
          </div>
        </div>
        <div className="gate-card">
          <div className="gate-t">접근 권한 없음</div>
          <p>이 페이지는 관리자(admin)만 볼 수 있습니다.</p>
        </div>
      </section>
    );
  }

  const dirtyCount = dirty.size;

  return (
    <section className="page-card" style={{ marginBottom: 0 }}>
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>
            검토자 설정 <span className="t-badge">관리자용</span>
            <span className="text-xs text-gray-500 font-normal ml-2">/ admin/reviewers</span>
            {dirtyCount > 0 && (
              <span className="badge dirty" style={{ marginLeft: 8 }}>
                미저장 변경 {dirtyCount}건
              </span>
            )}
          </h1>
          <div className="meta">
            계열 · 법인 · 전사 3단 폴백 + AI 1차 검토 ON/OFF
            {isLoading && " · 불러오는 중…"}
          </div>
        </div>
        <div className="actions">
          <button className="btn-sec" onClick={cancelAll} disabled={dirtyCount === 0}>
            ↺ 변경 취소
          </button>
        </div>
      </div>

      {error && (
        <div className="gate-card" style={{ marginTop: 12 }}>
          <div className="gate-t">데이터 로드 실패</div>
          <p>{(error as Error).message}</p>
        </div>
      )}

      <div className="grid grid-cols-5 gap-3" style={{ marginTop: 16 }}>
        <div className="stat-card">
          <div className="stat-label">계열 구성</div>
          <div className="stat-val">
            {stats.seriesConfigured} <small>/ {seriesList.length}</small>
          </div>
          <div className="stat-sub">2차/3차 팀 1개 이상 지정</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">법인 override</div>
          <div className="stat-val">
            {stats.overrideCount} <small>/ {companies.length}</small>
          </div>
          <div className="stat-sub">계열과 다른 검토팀 필요한 법인만</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">AI 1차 활성</div>
          <div className="stat-val">{stats.aiOn}</div>
          <div className="stat-sub">저장된 행 중 ON</div>
        </div>
        <div className={`stat-card ${stats.fbOk ? "success" : "warn"}`}>
          <div className="stat-label">전사 폴백</div>
          <div className="stat-val">{stats.fbOk ? "✓ 정상" : "⚠ 미설정"}</div>
          <div className="stat-sub">최후의 안전망</div>
        </div>
        <div className="stat-card warn">
          <div className="stat-label">미배정 법인</div>
          <div className="stat-val">{stats.orphanCompanies}</div>
          <div className="stat-sub">계열·override 모두 없음</div>
        </div>
      </div>

      <div className="priority-callout">
        <span style={{ color: "#64748b", fontWeight: 600 }}>🔗 폴백 우선순위:</span>
        <span className="step s1">1. 법인 override</span>
        <span className="arrow">→</span>
        <span className="step s2">2. 계열 default</span>
        <span className="arrow">→</span>
        <span className="step s3">3. 전사 fallback</span>
        <span style={{ flex: 1 }} />
        <span className="t-mini">신청건은 해당 단계 모든 팀에 노출, 누구나 처리 가능</span>
      </div>

      {/* 1) 계열별 */}
      <div className="section-card">
        <div className="section-h">
          <div className="sec-icon series">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <h2>계열별 (기본 단위)</h2>
          <span className="count-badge">{seriesList.length}개</span>
          <span className="right">
            구성됨 {stats.seriesConfigured} / {seriesList.length}
          </span>
        </div>
        <p className="section-desc">
          같은 계열 소속 법인은 모두 이 설정을 공유합니다.{" "}
          <span className="member-chip override" style={{ margin: 0, padding: "0 5px" }}>
            노란 *
          </span>{" "}
          표시는 법인별 override가 있어 계열 설정을 무시하는 법인.
        </p>

        <table className="rv-tbl">
          {tableHead}
          <tbody>
            {seriesList.map((s) => {
              const members = companies.filter((c) => c.series_id === s.id);
              const memberBadges = (
                <div>
                  {members.length === 0 ? (
                    <span className="t-mini">소속 법인 없음</span>
                  ) : (
                    members.map((c) => {
                      const ov = hasOverride(c.id);
                      return (
                        <span
                          key={c.id}
                          className={`member-chip ${ov ? "override" : ""}`}
                          title={
                            ov
                              ? `${c.name} — override 있음 (계열 설정 무시)`
                              : `${c.name} — 계열 설정 사용`
                          }
                        >
                          {c.code}
                        </span>
                      );
                    })
                  )}
                </div>
              );
              return renderRow(
                SERIES_PREFIX + s.id,
                "series",
                <>
                  {s.name} <span className="t-mini t-slate" style={{ fontWeight: 500 }}>{s.code}</span>
                </>,
                memberBadges,
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 2) 법인별 override */}
      <div className="section-card">
        <div className="section-h">
          <div className="sec-icon company">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
            </svg>
          </div>
          <h2>법인별 override (선택)</h2>
          <span className="count-badge">
            {stats.overrideCount} / {companies.length}
          </span>
          <span className="right">계열과 다른 검토팀이 필요한 법인만 등록</span>
        </div>

        <div className="ov-toolbar">
          <input
            type="text"
            placeholder="법인명 / 코드 검색"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <label>
            <input
              type="checkbox"
              checked={showAllOverrides}
              onChange={(e) => setShowAllOverrides(e.target.checked)}
            />
            전체 법인 표시 (미설정 포함)
          </label>
        </div>

        {visibleOverrides.length === 0 ? (
          <div className="empty-box">
            {filter
              ? "검색 결과 없음"
              : '등록된 override 없음 — 모든 법인이 계열/전사 폴백을 사용 중입니다. 추가하려면 위 "전체 법인 표시"를 켜세요.'}
          </div>
        ) : (
          <table className="rv-tbl">
            {tableHead}
            <tbody>
              {visibleOverrides.map((c) =>
                renderRow(
                  COMPANY_PREFIX + c.id,
                  "company",
                  `${c.name} (${c.code})`,
                  c.series_id ? (
                    <span>
                      <svg style={{ display: "inline", width: 11, height: 11, verticalAlign: -1 }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      </svg>{" "}
                      {seriesNameById[c.series_id] ?? "-"}
                    </span>
                  ) : (
                    <span style={{ color: "#b45309" }}>계열 미지정 — 전사 폴백 또는 직접 설정</span>
                  ),
                ),
              )}
            </tbody>
          </table>
        )}

        <div className="t-mini" style={{ marginTop: 8 }}>
          🗑 휴지통 = override 삭제 → 해당 법인은 계열 폴백으로 복귀
        </div>
      </div>

      {/* 3) 전사 fallback */}
      <div className="section-card">
        <div className="section-h">
          <div className="sec-icon fallback">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <h2>전사 fallback (최후 폴백)</h2>
          {stats.fbOk ? (
            <span className="badge status-ok">✓ 정상</span>
          ) : (
            <span className="badge status-danger">미설정</span>
          )}
        </div>
        <p className="section-desc">
          법인·계열 모두 비어 있을 때 사용하는 최종 폴백입니다. 반드시 1개 이상의 팀이 지정되어 있어야
          합니다.
        </p>

        <table className="rv-tbl">
          {tableHead}
          <tbody>{renderRow(FALLBACK_KEY, "fallback", "전사 fallback", "모든 법인 / 계열의 최후 폴백")}</tbody>
        </table>
      </div>

      <div className="t-mini" style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
        등록된 부서 {departments.length}개 (사용자 프로필 기준 — HR API에서 동기화됨)
      </div>
    </section>
  );
}

const PAGE_STYLES = `
.t-badge { display:inline-block; vertical-align:middle; margin-left:8px; padding:1px 8px; border-radius:9999px; background:#003876; color:#fff; font-size:11px; font-weight:600; }
.gate-card { border:1px solid #fecaca; background:#fef2f2; border-radius:10px; padding:18px; }
.gate-card .gate-t { font-weight:700; color:#b91c1c; margin-bottom:4px; }
.gate-card p { font-size:13px; color:#7f1d1d; margin:0; }

.stat-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; }
.stat-card .stat-label { font-size: 12px; color: #64748b; }
.stat-card .stat-val { font-size: 22px; font-weight: 700; color: #003876; line-height: 1.1; margin-top: 4px; }
.stat-card .stat-val small { font-size: 13px; font-weight: 500; color: #94a3b8; }
.stat-card .stat-sub { font-size: 11px; color: #94a3b8; margin-top: 4px; }
.stat-card.warn .stat-val { color: #b45309; }
.stat-card.success .stat-val { font-size: 16px; color: #047857; padding-top: 4px; }

.section-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; margin-top: 20px; padding: 18px; }
.section-h { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.section-h .sec-icon { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 6px; }
.section-h .sec-icon.series { background: #eff6ff; color: #003876; }
.section-h .sec-icon.company { background: #f5f3ff; color: #6d28d9; }
.section-h .sec-icon.fallback { background: #fef3c7; color: #92400e; }
.section-h h2 { font-size: 16px; font-weight: 700; color: #1f2937; margin: 0; }
.section-h .count-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
.section-h .right { margin-left: auto; font-size: 12px; color: #64748b; }
.section-desc { font-size: 12px; color: #64748b; margin: 0 0 14px 0; line-height: 1.5; }

.empty-box { border:1px solid #e2e8f0; border-radius:8px; padding:24px; text-align:center; font-size:13px; color:#94a3b8; background:#fafbfc; }

.rv-tbl { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: visible; margin-top:8px; }
.rv-tbl thead th { background: #f1f5f9; color: #003876; font-size: 12px; font-weight: 700; text-align: left; padding: 10px 12px; border-bottom: 1px solid #cbd5e1; white-space: nowrap; }
.rv-tbl tbody tr { border-bottom: 1px solid #f1f5f9; }
.rv-tbl tbody tr:hover { background: #fafbfc; }
.rv-tbl tbody tr.dirty { background: #eff6ff; }
.rv-tbl tbody td { padding: 14px 12px; vertical-align: top; color: #1f2937; font-size: 14px; }

.target-name { font-weight: 600; color: #1f2937; font-size: 14px; }
.target-sublabel { font-size: 11px; color: #94a3b8; margin-top: 4px; line-height: 1.4; }
.target-status { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px; }

.badge { display: inline-flex; align-items: center; gap: 4px; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 600; line-height: 1.5; }
.badge.status-ok { background: #ecfdf5; color: #047857; border: 1px solid #bbf7d0; }
.badge.status-fallback { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
.badge.status-warn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.badge.status-danger { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.badge.dirty { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }

.member-chip { display: inline-flex; align-items: center; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 500; background: #fff; color: #475569; border: 1px solid #e2e8f0; margin-right: 3px; margin-top: 2px; }
.member-chip.override { background: #fef3c7; color: #92400e; border-color: #fde68a; }
.member-chip.override::after { content: "*"; font-weight: 700; margin-left: 2px; opacity: 0.7; }

.tp { position: relative; }
.team-picker { display: flex; flex-wrap: wrap; gap: 4px; min-height: 36px; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; cursor: text; }
.team-picker:focus-within { border-color: #003876; box-shadow: 0 0 0 2px rgba(0,56,118,0.1); }
.team-picker .chip { display: inline-flex; align-items: center; gap: 4px; background: #eff6ff; color: #003876; border: 1px solid #bfdbfe; border-radius: 4px; padding: 1px 7px; font-size: 12px; font-weight: 500; line-height: 1.5; }
.team-picker .chip button { background: none; border: none; cursor: pointer; color: #003876; font-size: 12px; padding: 0; opacity: 0.6; }
.team-picker .chip button:hover { opacity: 1; }
.team-picker input { flex: 1; min-width: 90px; border: none; outline: none; font-size: 13px; color: #1f2937; background: transparent; }
.team-picker .placeholder { color: #94a3b8; font-size: 12px; padding: 4px; }

.tp-backdrop { position: fixed; inset: 0; z-index: 40; }
.tp-pop { position: absolute; z-index: 50; top: calc(100% + 4px); left: 0; width: 280px; max-width: 92vw; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 8px 24px rgba(15,23,42,0.14); padding: 8px; }
.tp-head { font-size: 11px; color: #94a3b8; padding: 2px 4px 6px; }
.tp-list { display: flex; flex-direction: column; gap: 2px; }
.tp-scroll { max-height: 240px; overflow-y: auto; }
.tp-opt { display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 6px; cursor: pointer; }
.tp-opt:hover { background: #f1f5f9; }
.tp-opt input[type="checkbox"] { width: 14px; height: 14px; cursor: pointer; }
.tp-opt-name { flex: 1; font-size: 13px; color: #1f2937; }
.tp-cnt { font-size: 11px; color: #94a3b8; }
.tp-tag { font-size: 10px; padding: 0 5px; border-radius: 999px; border: 1px solid #cbd5e1; color: #64748b; }
.tp-divider { border-top: 1px solid #e2e8f0; margin: 6px 0; }
.tp-add { border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 8px; display: flex; gap: 4px; }
.tp-add input { flex: 1; height: 30px; padding: 0 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; }
.tp-add input:focus { border-color: #003876; }
.tp-add button { height: 30px; padding: 0 10px; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 6px; font-size: 12px; font-weight: 500; color: #475569; cursor: pointer; }
.tp-add button:hover { background: #eff6ff; border-color: #003876; color: #003876; }
.tp-warn { margin-top: 8px; padding: 8px 10px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; }
.tp-warn-t { font-size: 12px; font-weight: 600; color: #92400e; margin-bottom: 4px; }
.tp-warn-d { font-size: 11px; color: #b45309; line-height: 1.4; margin-bottom: 6px; }
.tp-warn-fix { height: 26px; padding: 0 10px; font-size: 11px; font-weight: 500; border: 1px solid #fcd34d; background: #fef3c7; color: #92400e; border-radius: 6px; cursor: pointer; }
.tp-warn-fix:hover { background: #fde68a; }
.tp-similar { font-size: 11px; color: #94a3b8; margin-top: 6px; padding: 0 4px; }

.toggle { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.toggle .sw { width: 32px; height: 18px; border-radius: 999px; background: #cbd5e1; position: relative; cursor: pointer; transition: background 0.15s; }
.toggle .sw::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.2); transition: left 0.15s; }
.toggle.on .sw { background: #047857; }
.toggle.on .sw::after { left: 16px; }
.toggle .lbl { font-size: 11px; font-weight: 600; color: #64748b; }
.toggle.on .lbl { color: #047857; }

.row-acts { display: flex; gap: 4px; justify-content: flex-end; }
.row-acts button { height: 32px; padding: 0 12px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; border-radius: 6px; color: #475569; font-size: 12px; font-weight: 500; display: inline-flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; }
.row-acts button:hover:not(:disabled) { background: #eff6ff; color: #003876; border-color: #003876; }
.row-acts button.save-on { background: #003876; color: #fff; border-color: #003876; }
.row-acts button.save-on:hover:not(:disabled) { background: #002a5c; }
.row-acts button.del { width: 32px; padding: 0; color: #b91c1c; }
.row-acts button.del:hover:not(:disabled) { background: #fef2f2; border-color: #fecaca; color:#b91c1c; }
.row-acts button:disabled { opacity: 0.4; cursor: not-allowed; }
.row-acts svg { width: 13px; height: 13px; }

.ov-toolbar { display: flex; align-items: center; gap: 12px; margin: 10px 0 14px 0; flex-wrap: wrap; }
.ov-toolbar input[type="text"] { padding: 7px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; max-width: 260px; outline:none; }
.ov-toolbar input[type="text"]:focus { border-color: #003876; }
.ov-toolbar label { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #64748b; cursor: pointer; }
.ov-toolbar input[type="checkbox"] { width: 14px; height: 14px; cursor: pointer; }

.btn-sec { background: #fff; color: #003876; border: 1px solid #cbd5e1; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-sec:hover:not(:disabled) { background: #eff6ff; border-color: #003876; }
.btn-sec:disabled { opacity: 0.4; cursor: not-allowed; }

.priority-callout { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-top: 14px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 13px; }
.priority-callout .step { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; background: #fff; border: 1px solid #cbd5e1; color: #1f2937; font-weight: 500; }
.priority-callout .step.s1 { border-color: #c4b5fd; background: #f5f3ff; color: #6d28d9; }
.priority-callout .step.s2 { border-color: #93c5fd; background: #eff6ff; color: #003876; }
.priority-callout .step.s3 { border-color: #fcd34d; background: #fef3c7; color: #92400e; }
.priority-callout .arrow { color: #94a3b8; }

.t-mini { font-size: 11px; font-weight: 600; color: #64748b; }
.t-slate { color: #64748b !important; }
`;
