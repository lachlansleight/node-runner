"use client";

import { useState, useTransition, type FormEvent } from "react";
import { setEnvVarAction, unsetEnvVarAction, updateAppAction } from "@/actions/apps";
import { parseEnvText } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Section } from "@/components/ui/Section";
import { Textarea } from "@/components/ui/Textarea";
import type { DashApp } from "@/lib/types";

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Which modal is open: editing an existing key, or adding a new one. */
type Editing = { mode: "edit"; key: string } | { mode: "add" } | null;

export function EnvPanel({ app }: { app: DashApp }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function saveBulk() {
    setMsg(null);
    start(async () => {
      const r = await updateAppAction(app.id, { env: parseEnvText(text) });
      setMsg(r.ok ? "Saved — redeploy to apply." : (r.error ?? "Failed"));
      if (r.ok) {
        setText("");
        setBulkOpen(false);
      }
    });
  }

  return (
    <Section
      title="Environment variables"
      action={
        <Button variant="ghost" className="px-[8px] py-[4px]" onClick={() => setEditing({ mode: "add" })}>
          Add
        </Button>
      }
    >
      <div className="flex flex-col gap-[12px]">
        <div className="flex flex-wrap gap-[6px]">
          {app.envKeys.length === 0 ? (
            <span className="text-[12px] text-[var(--c-muted)]">None set.</span>
          ) : (
            app.envKeys.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setEditing({ mode: "edit", key: k })}
                title={`Edit ${k}`}
                className="rounded-[6px] border border-[var(--c-border)] px-[8px] py-[3px] font-mono text-[12px] transition hover:border-[var(--c-accent)]"
              >
                {k}
              </button>
            ))
          )}
        </div>

        <p className="text-[11px] text-[var(--c-muted)]">
          Values are write-only (never shown). Click a variable to change or remove it. Changes apply on
          the next deploy.
        </p>

        {bulkOpen ? (
          <div className="flex flex-col gap-[10px] border-t border-[var(--c-border)] pt-[12px]">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder={"Replace ALL env vars — one KEY=value per line"}
              autoFocus
            />
            <p className="text-[11px] text-[var(--c-muted)]">
              Saving replaces the full set — any variable not listed here is removed.
            </p>
            <div className="flex items-center gap-[8px]">
              <Button onClick={saveBulk} disabled={pending || !text.trim()}>
                Replace all
              </Button>
              <Button variant="ghost" onClick={() => setBulkOpen(false)} disabled={pending}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="self-start text-[12px] text-[var(--c-muted)] underline hover:text-[var(--c-text)]"
          >
            Replace all variables at once
          </button>
        )}

        {msg && <span className="text-[12px] text-[var(--c-muted)]">{msg}</span>}
      </div>

      {editing && (
        <EnvVarModal
          appId={app.id}
          existingKey={editing.mode === "edit" ? editing.key : null}
          onClose={() => setEditing(null)}
          onDone={(m) => {
            setEditing(null);
            setMsg(m);
          }}
        />
      )}
    </Section>
  );
}

function EnvVarModal({
  appId,
  existingKey,
  onClose,
  onDone,
}: {
  appId: string;
  /** null when adding a new variable. */
  existingKey: string | null;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [key, setKey] = useState(existingKey ?? "");
  const [value, setValue] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const k = key.trim();
    if (!KEY_RE.test(k)) return setError("Key must be letters, digits or underscores, not starting with a digit.");
    start(async () => {
      const r = await setEnvVarAction(appId, k, value);
      if (!r.ok) return setError(r.error ?? "Failed to save");
      onDone(`${k} saved — redeploy to apply.`);
    });
  }

  function remove() {
    if (!existingKey) return;
    setError(null);
    start(async () => {
      const r = await unsetEnvVarAction(appId, existingKey);
      if (!r.ok) return setError(r.error ?? "Failed to remove");
      onDone(`${existingKey} removed — redeploy to apply.`);
    });
  }

  return (
    <Modal title={existingKey ? "Edit variable" : "Add variable"} onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-[14px]">
        <Field label="Key">
          {existingKey ? (
            <span className="font-mono text-[13px]">{existingKey}</span>
          ) : (
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="DATABASE_URL" autoFocus />
          )}
        </Field>
        <Field label={existingKey ? "New value" : "Value"} hint={existingKey ? "The current value is never shown." : undefined}>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="value"
            autoFocus={Boolean(existingKey)}
            className="font-mono"
          />
        </Field>

        {error && <p className="text-[12px] text-[var(--c-red)]">{error}</p>}

        <div className="flex items-center gap-[8px]">
          {existingKey &&
            (confirmRemove ? (
              <>
                <span className="text-[12px] text-[var(--c-muted)]">Remove {existingKey}?</span>
                <Button type="button" variant="danger" disabled={pending} onClick={remove}>
                  Yes, remove
                </Button>
                <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirmRemove(false)}>
                  Keep
                </Button>
              </>
            ) : (
              <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirmRemove(true)}>
                Remove
              </Button>
            ))}
          <div className="ml-auto flex items-center gap-[8px]">
            <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
