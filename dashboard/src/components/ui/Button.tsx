import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-[var(--c-accent)] text-[var(--c-accent-text)] hover:opacity-90",
  secondary:
    "bg-[var(--c-surface-2)] text-[var(--c-text)] border border-[var(--c-border)] hover:border-[var(--c-accent)]",
  danger: "bg-[var(--c-red)] text-white hover:opacity-90",
  ghost: "text-[var(--c-muted)] hover:text-[var(--c-text)]",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "secondary", className = "", ...props }: Props) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-[6px] rounded-[8px] px-[14px] py-[8px] text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}
