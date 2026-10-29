import type { CSSProperties, ReactNode, Ref } from "react";

export function CodeBlock({
  children,
  className = "",
  style,
  ref,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLPreElement>;
}) {
  return (
    <pre
      ref={ref}
      style={style}
      className={`overflow-auto whitespace-pre-wrap break-all rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg)] p-[12px] text-[12px] leading-[1.6] text-[var(--c-muted)] ${className}`}
    >
      {children}
    </pre>
  );
}
