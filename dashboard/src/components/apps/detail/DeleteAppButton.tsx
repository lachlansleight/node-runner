"use client";

import { useState, useTransition } from "react";
import { deleteAppAction } from "@/actions/apps";
import { Button } from "@/components/ui/Button";

export function DeleteAppButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-[8px]">
      <span className="text-[12px] text-[var(--c-muted)]">Delete this app?</span>
      <Button variant="danger" disabled={pending} onClick={() => start(() => void deleteAppAction(id))}>
        Yes, delete
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}
