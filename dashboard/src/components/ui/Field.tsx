import type { ReactNode } from "react";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-[6px]">
      <span className="text-[12px] font-medium text-[var(--c-muted)]">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-[var(--c-muted)]">{hint}</span>}
    </label>
  );
}
