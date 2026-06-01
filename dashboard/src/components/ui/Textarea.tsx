import type { TextareaHTMLAttributes } from "react";

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg)] px-[12px] py-[9px] text-[13px] leading-[1.6] outline-none placeholder:text-[var(--c-muted)] focus:border-[var(--c-accent)] ${className}`}
    />
  );
}
