"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Section } from "@/components/ui/Section";

export function LogsPanel({ logs }: { logs: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const pre = useRef<HTMLPreElement>(null);

  // It's a tail: keep the newest lines in view on load and after each refresh.
  useEffect(() => {
    const el = pre.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  return (
    <Section
      title="Logs"
      action={
        <Button onClick={() => start(() => router.refresh())} disabled={pending}>
          {pending ? "…" : "Refresh"}
        </Button>
      }
    >
      <CodeBlock ref={pre} className="max-h-[400px]" style={{ fontSize: "8pt", lineHeight: 1.5 }}>
        {logs.trim() || "No logs yet."}
      </CodeBlock>
    </Section>
  );
}
