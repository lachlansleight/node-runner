import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`rounded-[12px] border border-[var(--c-border)] bg-[var(--c-surface)] ${className}`}
    />
  );
}
