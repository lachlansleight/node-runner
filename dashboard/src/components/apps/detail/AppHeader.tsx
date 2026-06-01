import Link from "next/link";
import { timeAgo } from "@/lib/format";
import type { DashApp } from "@/lib/types";
import { StatusBadge } from "../StatusBadge";

export function AppHeader({ app }: { app: DashApp }) {
  return (
    <div className="flex flex-col gap-[10px]">
      <Link href="/" className="text-[13px] text-[var(--c-muted)] hover:text-[var(--c-text)]">
        ← Apps
      </Link>
      <div className="flex items-center justify-between gap-[12px]">
        <h1 className="text-[22px] font-semibold">{app.name}</h1>
        <StatusBadge status={app.status} />
      </div>
      <div className="flex flex-wrap items-center gap-[10px] text-[12px] text-[var(--c-muted)]">
        {app.domains.map((d) => (
          <a
            key={d}
            href={`https://${d}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-[6px] border border-[var(--c-border)] px-[8px] py-[3px] hover:border-[var(--c-accent)]"
          >
            {d} ↗
          </a>
        ))}
        <span>
          last deploy {timeAgo(app.lastDeploy?.at)}
          {app.lastDeploy?.commit ? ` · ${app.lastDeploy.commit}` : ""}
        </span>
      </div>
      {app.lastDeploy?.status === "failed" && app.lastDeploy.message && (
        <p className="text-[12px] text-[var(--c-red)]">{app.lastDeploy.message}</p>
      )}
    </div>
  );
}
