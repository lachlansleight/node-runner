import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function EmptyState() {
  return (
    <Card className="flex flex-col items-center gap-[14px] p-[48px] text-center">
      <p className="text-[14px] text-[var(--c-muted)]">No apps yet.</p>
      <Link href="/apps/new">
        <Button variant="primary">Create your first app</Button>
      </Link>
    </Card>
  );
}
