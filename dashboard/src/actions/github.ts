"use server";

import * as agent from "@/lib/agent";
import type { GithubRepo } from "@/lib/types";

export async function listReposAction(): Promise<{ repos: GithubRepo[]; error?: string }> {
  try {
    return await agent.listGithubRepos();
  } catch (err) {
    return { repos: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function listBranchesAction(
  owner: string,
  repo: string,
  installationId: number,
): Promise<{ branches: string[]; error?: string }> {
  try {
    return await agent.listGithubBranches(owner, repo, installationId);
  } catch (err) {
    return { branches: [], error: err instanceof Error ? err.message : String(err) };
  }
}
