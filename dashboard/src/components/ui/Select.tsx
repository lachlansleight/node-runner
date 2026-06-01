import type { SelectHTMLAttributes } from "react";

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg)] px-[12px] py-[9px] text-[13px] outline-none focus:border-[var(--c-accent)] disabled:opacity-50 ${className}`}
    />
  );
}
