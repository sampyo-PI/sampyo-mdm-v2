import { useEffect, useState } from "react";

type Fs = "sm" | "md" | "lg" | "xl";

const SIZES: Fs[] = ["sm", "md", "lg", "xl"];
const LABEL: Record<Fs, string> = { sm: "A−", md: "A", lg: "A+", xl: "A++" };

export function FsToggle() {
  const [fs, setFs] = useState<Fs>(() => {
    const v = (typeof document !== "undefined" && document.documentElement.dataset.fs) as Fs | undefined;
    return v ?? "md";
  });

  useEffect(() => {
    document.documentElement.dataset.fs = fs;
  }, [fs]);

  return (
    <div className="fs-toggle" id="fs-toggle">
      {SIZES.map((s) => (
        <button
          key={s}
          type="button"
          data-fs={s}
          className={s === fs ? "on" : ""}
          onClick={() => setFs(s)}
        >
          {LABEL[s]}
        </button>
      ))}
    </div>
  );
}
