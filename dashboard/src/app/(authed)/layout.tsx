import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { isAuthed } from "@/lib/session";

export default async function AuthedLayout({ children }: { children: ReactNode }) {
  if (!(await isAuthed())) redirect("/login");

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-[960px] px-[20px] py-[24px]">{children}</main>
    </>
  );
}
