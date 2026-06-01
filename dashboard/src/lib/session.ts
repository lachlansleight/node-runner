import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "nr_session";

function expectedToken(): string {
  const secret = process.env.AUTH_SECRET ?? "";
  return createHmac("sha256", secret).update("node-runner-authenticated:v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function isAuthed(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value;
  return Boolean(value) && safeEqual(value!, expectedToken());
}

export function checkPassword(password: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD ?? "";
  return expected.length > 0 && safeEqual(password, expected);
}

export async function createSession(): Promise<void> {
  (await cookies()).set(COOKIE, expectedToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
