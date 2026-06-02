import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { rest } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

type Large = { id: string; name: string };
type Medium = { id: string; name: string; large_category_id: string };
type SmallRow = {
  id: string;
  name: string;
  code: string;
  medium_category_id: string;
  name_template: string | null;
};
type MappingRow = {
  id: string;
  small_category_id: string;
  attribute_id: string;
  include_in_name: boolean;
  sort_order: number;
  attributes: { name: string } | null;
};

type Mapping = { id: string; attribute_name: string; sort_order: number; include_in_name: boolean };
type SmallCat = {
  id: string;
  name: string;
  code: string;
  medium_category_id: string;
  large_category_id: string;
  medium_name: string;
  large_name: string;
  name_template: string | null;
  mappings: Mapping[];
};

const DEFAULT_TPL = "{small_name} {*}";

async function fetchAllMappings(): Promise<MappingRow[]> {
  // PostgREST 기본 1000행 제한 우회 — limit/offset 페이지네이션
  const all: MappingRow[] = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const page = await rest<MappingRow[]>("GET", "category_attribute_mappings", {
      params: {
        select: "id,small_category_id,attribute_id,include_in_name,sort_order,attributes(name)",
        limit: String(PAGE),
        offset: String(offset),
      },
    });
    all.push(...page);
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function fetchData() {
  const [larges, mediums, smalls, mappings] = await Promise.all([
    rest<Large[]>("GET", "category_large", { params: { select: "id,name", order: "sort_order.asc" } }),
    rest<Medium[]>("GET", "category_medium", {
      params: { select: "id,name,large_category_id", order: "sort_order.asc" },
    }),
    rest<SmallRow[]>("GET", "category_small", {
      params: { select: "id,name,code,medium_category_id,name_template", order: "sort_order.asc" },
    }),
    fetchAllMappings(),
  ]);

  const medMap = new Map(mediums.map((m) => [m.id, m]));
  const largeMap = new Map(larges.map((l) => [l.id, l]));
  const bySmall = new Map<string, Mapping[]>();
  for (const m of mappings) {
    const list = bySmall.get(m.small_category_id) ?? [];
    list.push({
      id: m.id,
      attribute_name: m.attributes?.name ?? "",
      sort_order: m.sort_order,
      include_in_name: m.include_in_name,
    });
    bySmall.set(m.small_category_id, list);
  }

  const enriched: SmallCat[] = smalls.map((s) => {
    const medium = medMap.get(s.medium_category_id);
    const large = medium ? largeMap.get(medium.large_category_id) : undefined;
    return {
      id: s.id,
      name: s.name,
      code: s.code,
      medium_category_id: s.medium_category_id,
      large_category_id: medium?.large_category_id ?? "",
      medium_name: medium?.name ?? "",
      large_name: large?.name ?? "",
      name_template: s.name_template,
      mappings: (bySmall.get(s.id) ?? []).sort((a, b) => a.sort_order - b.sort_order),
    };
  });

  return { larges, mediums, enriched };
}

export function IncludeInNameReviewPage() {
  const { isAdmin } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["include-in-name-review"],
    queryFn: fetchData,
    staleTime: 60_000,
    enabled: isAdmin,
  });

  const [selLarge, setSelLarge] = useState("all");
  const [selMedium, setSelMedium] = useState("all");
  const [q, setQ] = useState("");
  const [showPreview, setShowPreview] = useState(true);

  const larges = data?.larges ?? [];
  const mediums = data?.mediums ?? [];
  const all = data?.enriched ?? [];

  const filteredMediums = useMemo(
    () => (selLarge === "all" ? mediums : mediums.filter((m) => m.large_category_id === selLarge)),
    [mediums, selLarge],
  );

  const filtered = useMemo(
    () =>
      all.filter((s) => {
        if (selLarge !== "all" && s.large_category_id !== selLarge) return false;
        if (selMedium !== "all" && s.medium_category_id !== selMedium) return false;
        if (q) {
          const t = q.toLowerCase();
          if (!s.name.toLowerCase().includes(t) && !s.code.toLowerCase().includes(t)) return false;
        }
        return true;
      }),
    [all, selLarge, selMedium, q],
  );

  const makerOn = (c: SmallCat) => (c.name_template ?? DEFAULT_TPL).includes("{maker}");
  const modelOn = (c: SmallCat) => (c.name_template ?? DEFAULT_TPL).includes("{model}");

  const preview = (c: SmallCat) => {
    const parts = [c.name];
    if (makerOn(c)) parts.push("(제조사)");
    if (modelOn(c)) parts.push("(모델)");
    for (const m of c.mappings.filter((m) => m.include_in_name)) parts.push(`{${m.attribute_name}}`);
    return parts.join(" ");
  };

  if (!isAdmin) {
    return (
      <section className="page-card">
        <style>{PAGE_STYLES}</style>
        <div className="page-h">
          <div>
            <h1>
              품목명 관리
              <span className="text-xs text-gray-500 font-normal ml-2">/ classification/include-in-name</span>
            </h1>
            <div className="meta">관리자 전용 페이지</div>
          </div>
        </div>
        <div className="callout danger">
          <div className="ct-title">접근 권한 없음</div>
          <p>이 페이지는 관리자(admin)만 볼 수 있습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-card">
      <style>{PAGE_STYLES}</style>

      <div className="page-h">
        <div>
          <h1>
            품목명 관리 <span className="t-badge">관리자용</span>
            <span className="text-xs text-gray-500 font-normal ml-2">/ classification/include-in-name</span>
          </h1>
          <div className="meta">
            소분류별 normalized_name 속성 구성 검토
            {isLoading && " · 불러오는 중…"}
          </div>
        </div>
        <div className="actions">
          <button className="btn-sec" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? "미리보기 숨김" : "미리보기 표시"}
          </button>
          <button className="btn-pri" disabled title="읽기 전용 — 저장은 v1에서 수행">
            저장 (비활성)
          </button>
        </div>
      </div>

      <div className="callout info">
        <div className="ct-title">🔒 읽기 전용 (v2 DB 연결 검증)</div>
        <p>
          현재 v2에서는 실제 분류·속성 구성을 <strong>조회만</strong> 합니다. include_in_name 토글·제조사/모델
          포함·품목명 재계산은 v1(운영) 화면에서 수행하세요.
        </p>
      </div>

      <div className="filter-card">
        <div>
          <label>대분류</label>
          <select
            value={selLarge}
            onChange={(e) => {
              setSelLarge(e.target.value);
              setSelMedium("all");
            }}
          >
            <option value="all">대분류 전체</option>
            {larges.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>중분류</label>
          <select value={selMedium} onChange={(e) => setSelMedium(e.target.value)} disabled={selLarge === "all"}>
            <option value="all">중분류 전체</option>
            {filteredMediums.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>소분류 검색</label>
          <input type="search" placeholder="소분류명·코드…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="count-chip">
          {isLoading ? "불러오는 중…" : `${filtered.length}개 표시 / 전체 ${all.length}개`}
        </div>
      </div>

      <div className="tbl-wrap">
        <table className="iin-tbl">
          <thead>
            <tr>
              <th className="col-cat">소분류</th>
              <th>
                품목명 구성 <span className="th-hint">(파란 항목이 품목명에 포함됨)</span>
              </th>
              {showPreview && <th className="col-prev">미리보기</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={showPreview ? 3 : 2} className="empty">
                  불러오는 중…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={showPreview ? 3 : 2} className="empty">
                  검색 결과가 없습니다
                </td>
              </tr>
            ) : (
              filtered.map((cat) => {
                const sortOrders = cat.mappings.map((m) => m.sort_order);
                const dupOrders = new Set(sortOrders.filter((v, i) => sortOrders.indexOf(v) !== i));
                return (
                  <tr key={cat.id}>
                    <td className="col-cat">
                      <div className="cat-name">{cat.name}</div>
                      <div className="cat-code">{cat.code}</div>
                      <div className="cat-path">
                        {cat.large_name} ▸ {cat.medium_name}
                      </div>
                    </td>
                    <td>
                      <div className="chips">
                        <span className={`pchip ${makerOn(cat) ? "on" : ""}`}>제조사</span>
                        <span className={`pchip ${modelOn(cat) ? "on" : ""}`}>모델명</span>
                        {cat.mappings.length === 0 ? (
                          <span className="no-attr">속성 없음</span>
                        ) : (
                          cat.mappings.map((m) => {
                            const dup = dupOrders.has(m.sort_order);
                            return (
                              <span
                                key={m.id}
                                className={`pchip attr ${m.include_in_name ? "on" : ""} ${dup ? "dup" : ""}`}
                                title={dup ? `순서 ${m.sort_order} 중복 — 분류-속성 매핑에서 수정 필요` : undefined}
                              >
                                {m.sort_order}. {m.attribute_name}
                                {dup ? " ⚠" : ""}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>
                    {showPreview && <td className="col-prev mono">{preview(cat)}</td>}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const PAGE_STYLES = `
.t-badge { display:inline-block; vertical-align:middle; margin-left:8px; padding:1px 8px; border-radius:9999px; background:#003876; color:#fff; font-size:11px; font-weight:600; }
.filter-card .count-chip { margin-left:auto; align-self:center; font-size:12px; color:#64748b; }

.tbl-wrap { border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; background:#fff; margin-top:4px; }
.iin-tbl { width:100%; border-collapse:collapse; font-size:13px; }
.iin-tbl thead th { text-align:left; padding:10px 14px; background:#f8fafc; color:#003876; font-weight:700; font-size:12px; border-bottom:1px solid #e2e8f0; white-space:nowrap; }
.iin-tbl thead .th-hint { color:#94a3b8; font-weight:400; font-size:11px; margin-left:6px; }
.iin-tbl td { padding:10px 14px; border-top:1px solid #f1f5f9; vertical-align:top; }
.iin-tbl tr:hover td { background:#fafbfc; }
.iin-tbl .col-cat { width:230px; }
.iin-tbl .col-prev { width:300px; }
.iin-tbl .empty { text-align:center; color:#94a3b8; padding:40px 0; }

.cat-name { font-weight:600; color:#1f2937; }
.cat-code { font-family:ui-monospace,monospace; font-size:11px; color:#64748b; }
.cat-path { font-size:11px; color:#94a3b8; margin-top:1px; }

.chips { display:flex; flex-wrap:wrap; gap:6px; }
.pchip { display:inline-flex; align-items:center; padding:2px 8px; border-radius:6px; font-size:11px; border:1px solid transparent; background:#f1f5f9; color:#94a3b8; white-space:nowrap; }
.pchip.on { background:#eff6ff; border-color:#bfdbfe; color:#1d4ed8; font-weight:600; }
.pchip.attr.on { background:#e0edff; border-color:#93c5fd; color:#003876; }
.pchip.dup { border-style:dashed; border-color:#f59e0b; }
.no-attr { font-size:11px; color:#94a3b8; align-self:center; }

.col-prev.mono { font-family:ui-monospace,monospace; font-size:12px; color:#475569; word-break:break-all; }
`;
