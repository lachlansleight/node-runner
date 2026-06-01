import Link from "next/link";
import { CreateAppForm } from "@/components/apps/CreateAppForm";
import * as agent from "@/lib/agent";
import type { GithubRepo, GithubStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewAppPage() {
  let status: GithubStatus | null = null;
  let repos: GithubRepo[] = [];
  try {
    status = await agent.getGithubStatus();
    if (status.configured && status.installations.length > 0) {
      repos = (await agent.listGithubRepos()).repos;
    }
  } catch {
    status = null;
  }

  return (
    <div className="mx-auto max-w-[640px]">
      <Link href="/" className="text-[13px] text-[var(--c-muted)] hover:text-[var(--c-text)]">
        ← Apps
      </Link>
      <h1 className="mb-[20px] mt-[10px] text-[20px] font-semibold">New app</h1>
      <CreateAppForm github={status} repos={repos} />
    </div>
  );
}
