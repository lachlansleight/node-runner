import { notFound } from "next/navigation";
import { AppActions } from "@/components/apps/detail/AppActions";
import { AppHeader } from "@/components/apps/detail/AppHeader";
import { ConfigPanel } from "@/components/apps/detail/ConfigPanel";
import { DeployKeyPanel } from "@/components/apps/detail/DeployKeyPanel";
import { DomainsPanel } from "@/components/apps/detail/DomainsPanel";
import { EnvPanel } from "@/components/apps/detail/EnvPanel";
import { LogsPanel } from "@/components/apps/detail/LogsPanel";
import { WebhookPanel } from "@/components/apps/detail/WebhookPanel";
import { getApp, getDeployKey, getLogs, getWebhook } from "@/lib/agent";
import type { DashApp } from "@/lib/types";

export const dynamic = "force-dynamic";

function isSshRepo(url: string): boolean {
  return /^git@/.test(url) || /^ssh:\/\//.test(url);
}

export default async function AppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let app: DashApp;
  try {
    app = await getApp(id);
  } catch {
    notFound();
  }

  const managed = Boolean(app.repoFullName);

  const [logsResult, webhook] = await Promise.all([
    getLogs(id).catch(() => ({ logs: "" })),
    managed ? Promise.resolve(null) : getWebhook().catch(() => null),
  ]);
  // Deploy keys only apply to manual SSH repos; managed apps use installation tokens.
  const deployKey =
    !managed && isSshRepo(app.repoUrl)
      ? await getDeployKey(id)
          .then((r) => r.publicKey)
          .catch(() => null)
      : null;

  return (
    <div className="flex flex-col gap-[16px]">
      <AppHeader app={app} />
      <AppActions app={app} />
      <ConfigPanel app={app} />
      <DomainsPanel app={app} />
      <EnvPanel app={app} />
      {deployKey && <DeployKeyPanel publicKey={deployKey} />}
      <WebhookPanel
        webhook={webhook}
        managed={managed}
        branch={app.branch}
        repoFullName={app.repoFullName}
      />
      <LogsPanel logs={logsResult.logs} />
    </div>
  );
}
