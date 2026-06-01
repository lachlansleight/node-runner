import type { ReactNode } from "react";

export function InfoRow({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-[16px] border-b border-[var(--c-border)] py-[8px] last:border-b-0">
      <span className="shrink-0 text-[12px] text-[var(--c-muted)]">{label}</span>
      <span className={`break-all text-right text-[13px] ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
