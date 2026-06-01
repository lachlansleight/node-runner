import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export function TopBar() {
  return (
    <header className="sticky top-[0px] z-10 border-b border-[var(--c-border)] bg-[var(--c-bg)]">
      <div className="mx-auto flex max-w-[960px] items-center justify-between px-[20px] py-[14px]">
        <Link href="/" className="flex items-center gap-[8px] text-[15px] font-semibold">
          <span className="text-[var(--c-accent)]">●</span> node-runner
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}
