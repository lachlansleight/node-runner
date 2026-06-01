import { Section } from "@/components/ui/Section";
import type { DashApp } from "@/lib/types";
import { InfoRow } from "./InfoRow";

export function ConfigPanel({ app }: { app: DashApp }) {
  return (
    <Section title="Configuration">
      <div className="flex flex-col">
        <InfoRow label="Repository" value={app.repoUrl} mono />
        <InfoRow label="Branch" value={app.branch} mono />
        {app.subdir && <InfoRow label="Subdirectory" value={app.subdir} mono />}
        <InfoRow label="Install" value={app.installCommand || "—"} mono />
        <InfoRow label="Build" value={app.buildCommand || "—"} mono />
        <InfoRow label="Start" value={app.startCommand} mono />
        <InfoRow label="Port" value={app.port} mono />
        <InfoRow label="Node" value={app.nodeVersion ?? "system default"} mono />
      </div>
    </Section>
  );
}
