import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { timeAgo } from "@/lib/format";
import type { DashApp } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

export function AppCard({ app }: { app: DashApp }) {
  return (
    <Link href={`/apps/${app.id}`}>
      <Card className="h-full p-[16px] transition hover:border-[var(--c-accent)]">
        <div className="mb-[10px] flex items-center justify-between gap-[10px]">
          <span className="truncate text-[15px] font-semibold">{app.name}</span>
          <StatusBadge status={app.status} />
        </div>
        <div className="mb-[12px] truncate text-[12px] text-[var(--c-muted)]">
          {app.domains[0] ?? `127.0.0.1:${app.port}`}
        </div>
        <div className="flex items-center justify-between text-[11px] text-[var(--c-muted)]">
          <span className="truncate">{app.branch}</span>
          <span className="shrink-0">deployed {timeAgo(app.lastDeploy?.at)}</span>
        </div>
      </Card>
    </Link>
  );
}
