"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Section } from "@/components/ui/Section";

export function LogsPanel({ logs }: { logs: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Section
      title="Logs"
      action={
        <Button onClick={() => start(() => router.refresh())} disabled={pending}>
          {pending ? "…" : "Refresh"}
        </Button>
      }
    >
      <CodeBlock>{logs.trim() || "No logs yet."}</CodeBlock>
    </Section>
  );
}
