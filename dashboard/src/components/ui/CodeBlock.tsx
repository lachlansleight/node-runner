import type { ReactNode } from "react";

export function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-auto whitespace-pre-wrap break-all rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg)] p-[12px] text-[12px] leading-[1.6] text-[var(--c-muted)]">
      {children}
    </pre>
  );
}
