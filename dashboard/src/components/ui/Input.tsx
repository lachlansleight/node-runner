import type { InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg)] px-[12px] py-[9px] text-[13px] outline-none placeholder:text-[var(--c-muted)] focus:border-[var(--c-accent)] ${className}`}
    />
  );
}
