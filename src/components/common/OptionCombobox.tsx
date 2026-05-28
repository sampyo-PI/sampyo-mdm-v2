import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { useMemo, useState } from "react";

export type OptionItem = {
  value: string;
  label: string;
  sub?: string;
};

type Props = {
  /** 선택된 value (id) — null이면 미선택 */
  value: string | null;
  /** 선택 변경 콜백. null = 선택 해제 */
  onChange: (value: string | null) => void;
  options: OptionItem[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** 신규 등록 콜백 — 입력한 새 값 전달. 정의 시 footer에 "+ 신규 등록" 노출 */
  onCreate?: (newLabel: string) => Promise<void> | void;
  /** 입력 query를 그대로 자유 텍스트로 사용할 수 있게 (모델명 등 마스터 없는 케이스) */
  freeText?: boolean;
  /** freeText 모드에서 query를 현재 표시값으로 사용 */
  freeTextValue?: string;
};

export function OptionCombobox({
  value,
  onChange,
  options,
  placeholder = "선택",
  disabled,
  className,
  onCreate,
  freeText,
  freeTextValue,
}: Props) {
  const [query, setQuery] = useState("");

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.sub ?? "").toLowerCase().includes(q),
    );
  }, [options, query]);

  const showCreate = !!onCreate && query.trim().length > 0 && !options.some((o) => o.label === query.trim());

  const handleCreate = async () => {
    if (!onCreate) return;
    const newLabel = query.trim();
    if (!newLabel) return;
    await onCreate(newLabel);
    setQuery("");
  };

  return (
    <Combobox
      value={selected}
      onChange={(v: OptionItem | null) => onChange(v?.value ?? null)}
      disabled={disabled}
    >
      <div className={`relative ${className ?? ""}`}>
        <div className="relative">
          <ComboboxInput
            className="combo-trigger w-full pr-8"
            displayValue={(o: OptionItem | null) => (freeText && !o ? (freeTextValue ?? "") : (o?.label ?? ""))}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              if (freeText) {
                onChange(v || null);
              }
            }}
            placeholder={placeholder}
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2 text-text-sub">
            ▾
          </ComboboxButton>
        </div>
        <ComboboxOptions
          anchor="bottom start"
          className="combo-pop w-[var(--input-width)] mt-1 z-50 empty:hidden"
        >
          {filtered.length === 0 && !showCreate ? (
            <div className="combo-empty">결과 없음</div>
          ) : (
            filtered.map((o) => (
              <ComboboxOption
                key={o.value}
                value={o}
                className="combo-item data-[focus]:bg-blue-50 data-[selected]:font-semibold"
              >
                <span style={{ flex: 1 }}>{o.label}</span>
                {o.sub && <span className="text-xs text-text-sub">{o.sub}</span>}
              </ComboboxOption>
            ))
          )}
          {showCreate && (
            <div
              className="combo-item"
              onClick={handleCreate}
              style={{
                borderTop: "1px solid #e2e8f0",
                color: "#003876",
                fontWeight: 600,
                cursor: "pointer",
                background: "#eff6ff",
              }}
            >
              ＋ "{query.trim()}" 신규 등록
            </div>
          )}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}
