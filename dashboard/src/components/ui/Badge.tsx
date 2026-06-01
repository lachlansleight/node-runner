export function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-[6px] rounded-[999px] border border-[var(--c-border)] px-[10px] py-[3px] text-[12px]">
      <span className="h-[7px] w-[7px] rounded-[999px]" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
