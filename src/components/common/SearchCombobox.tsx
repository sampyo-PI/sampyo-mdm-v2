import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import { useState } from "react";

type Props = {
  value: string | null;
  onChange: (value: string | null) => void;
  options: string[];
  /** 값=null일 때 표시 라벨, 트리거 placeholder */
  allLabel?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * 검색 가능한 단일 선택 콤보박스.
 * - 전체(null) ↔ 특정 옵션 단일 선택
 * - 트리거 클릭 → 입력 + 옵션 리스트
 * - 부분일치 검색 (대소문자 무시)
 */
export function SearchCombobox({ value, onChange, options, allLabel = "전체", disabled, className }: Props) {
  const [query, setQuery] = useState("");

  const filtered =
    query.trim() === ""
      ? options
      : options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Combobox
      value={value}
      onChange={(v: string | null) => onChange(v && v !== allLabel ? v : null)}
      disabled={disabled}
    >
      <div className={`relative ${className ?? ""}`}>
        <div className="relative">
          <ComboboxInput
            className="combo-trigger w-full pr-8"
            displayValue={(v: string | null) => v ?? allLabel}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={allLabel}
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2 text-text-sub">
            ▾
          </ComboboxButton>
        </div>
        <ComboboxOptions
          anchor="bottom start"
          className="combo-pop w-[var(--input-width)] mt-1 z-50 empty:hidden"
        >
          <ComboboxOption
            value={null}
            className="combo-item data-[focus]:bg-blue-50 data-[selected]:font-semibold"
          >
            {allLabel}
          </ComboboxOption>
          {filtered.length === 0 ? (
            <div className="combo-empty">결과 없음</div>
          ) : (
            filtered.map((o) => (
              <ComboboxOption
                key={o}
                value={o}
                className="combo-item data-[focus]:bg-blue-50 data-[selected]:font-semibold"
              >
                {o}
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}
