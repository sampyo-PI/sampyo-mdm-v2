/**
 * items.attributes JSONB는 array {name,value}[] OR object {name:value} 두 형태 혼재.
 * 5-20에 DB 정규화 완료했지만 안전상 가드 유지.
 */
export type Attr = { name: string; value: string };

export function asAttrArray(raw: unknown): Attr[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Attr[];
  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).map(([name, value]) => ({
      name,
      value: String(value ?? ""),
    }));
  }
  return [];
}

/** yyMM 6글자 (e.g. "2605"). 잘못된 값은 "----". */
export function formatYyMm(date: string | null | undefined): string {
  if (!date) return "----";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "----";
  return `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}`;
}
