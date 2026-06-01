"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as agent from "@/lib/agent";
import type { CreateAppInput, UpdateAppInput } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function guard(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function createAppAction(input: CreateAppInput): Promise<ActionResult> {
  let id: string | undefined;
  const result = await guard(async () => {
    const app = await agent.createApp(input);
    id = app.id;
  });
  if (!result.ok) return result;
  revalidatePath("/");
  redirect(`/apps/${id}`);
}

export async function updateAppAction(id: string, patch: UpdateAppInput): Promise<ActionResult> {
  const result = await guard(async () => {
    await agent.updateApp(id, patch);
  });
  revalidatePath(`/apps/${id}`);
  return result;
}

export async function deployAppAction(id: string): Promise<ActionResult> {
  const result = await guard(async () => {
    await agent.deployApp(id);
  });
  revalidatePath(`/apps/${id}`);
  revalidatePath("/");
  return result;
}

export async function stopAppAction(id: string): Promise<ActionResult> {
  const result = await guard(async () => {
    await agent.stopApp(id);
  });
  revalidatePath(`/apps/${id}`);
  revalidatePath("/");
  return result;
}

export async function startAppAction(id: string): Promise<ActionResult> {
  const result = await guard(async () => {
    await agent.startApp(id);
  });
  revalidatePath(`/apps/${id}`);
  revalidatePath("/");
  return result;
}

export async function deleteAppAction(id: string): Promise<ActionResult> {
  const result = await guard(async () => {
    await agent.deleteApp(id);
  });
  if (!result.ok) return result;
  revalidatePath("/");
  redirect("/");
}
