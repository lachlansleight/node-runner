import { Badge } from "@/components/ui/Badge";
import type { AppStatus } from "@/lib/types";

const map: Record<AppStatus, { color: string; label: string }> = {
  running: { color: "var(--c-green)", label: "running" },
  deploying: { color: "var(--c-blue)", label: "deploying" },
  created: { color: "var(--c-muted)", label: "created" },
  stopped: { color: "var(--c-amber)", label: "stopped" },
  errored: { color: "var(--c-red)", label: "errored" },
};

export function StatusBadge({ status }: { status: AppStatus }) {
  const s = map[status] ?? map.created;
  return <Badge color={s.color} label={s.label} />;
}
