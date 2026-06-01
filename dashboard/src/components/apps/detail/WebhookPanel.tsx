import { CopyButton } from "@/components/ui/CopyButton";
import { Section } from "@/components/ui/Section";
import type { WebhookInfo } from "@/lib/types";
import { InfoRow } from "./InfoRow";

export function WebhookPanel({ webhook }: { webhook: WebhookInfo | null }) {
  if (!webhook) return null;
  return (
    <Section
      title="Auto-deploy webhook"
      action={webhook.publicUrl ? <CopyButton value={webhook.publicUrl} label="Copy URL" /> : undefined}
    >
      <div className="flex flex-col gap-[10px]">
        <p className="text-[12px] text-[var(--c-muted)]">
          In the repo: Settings → Webhooks → Add webhook. Content type{" "}
          <span className="font-mono">application/json</span>, event: push.
        </p>
        <InfoRow label="Payload URL" value={webhook.publicUrl ?? "set a control domain first"} mono />
        <div className="flex items-center justify-between gap-[10px] py-[8px]">
          <span className="text-[12px] text-[var(--c-muted)]">Secret</span>
          <CopyButton value={webhook.secret} label="Copy secret" />
        </div>
      </div>
    </Section>
  );
}
