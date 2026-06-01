import { CodeBlock } from "@/components/ui/CodeBlock";
import { CopyButton } from "@/components/ui/CopyButton";
import { Section } from "@/components/ui/Section";

export function DeployKeyPanel({ publicKey }: { publicKey: string }) {
  return (
    <Section title="Deploy key" action={<CopyButton value={publicKey} label="Copy key" />}>
      <p className="mb-[10px] text-[12px] text-[var(--c-muted)]">
        Private repo detected. Add this as a read-only Deploy key in the repo (Settings → Deploy
        keys) so the agent can clone it.
      </p>
      <CodeBlock>{publicKey}</CodeBlock>
    </Section>
  );
}
