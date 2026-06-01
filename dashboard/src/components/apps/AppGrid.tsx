import type { DashApp } from "@/lib/types";
import { AppCard } from "./AppCard";
import { EmptyState } from "./EmptyState";

export function AppGrid({ apps }: { apps: DashApp[] }) {
  if (apps.length === 0) return <EmptyState />;
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-[14px]">
      {apps.map((app) => (
        <AppCard key={app.id} app={app} />
      ))}
    </div>
  );
}
