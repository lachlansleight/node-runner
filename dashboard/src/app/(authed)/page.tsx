import Link from "next/link";
import { AppGrid } from "@/components/apps/AppGrid";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { listApps } from "@/lib/agent";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let apps;
  try {
    apps = await listApps();
  } catch (err) {
    return (
      <Card className="p-[20px]">
        <h1 className="mb-[8px] text-[16px] font-semibold">Can&apos;t reach the agent</h1>
        <p className="text-[13px] text-[var(--c-muted)]">
          {err instanceof Error ? err.message : String(err)}
        </p>
        <p className="mt-[10px] text-[12px] text-[var(--c-muted)]">
          Check AGENT_URL and AGENT_TOKEN in the dashboard&apos;s environment.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-[20px] flex items-center justify-between">
        <h1 className="text-[20px] font-semibold">Apps</h1>
        <Link href="/apps/new">
          <Button variant="primary">New app</Button>
        </Link>
      </div>
      <AppGrid apps={apps} />
    </div>
  );
}
