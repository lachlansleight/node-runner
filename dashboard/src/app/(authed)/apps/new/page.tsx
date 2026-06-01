import Link from "next/link";
import { CreateAppForm } from "@/components/apps/CreateAppForm";

export default function NewAppPage() {
  return (
    <div className="mx-auto max-w-[640px]">
      <Link href="/" className="text-[13px] text-[var(--c-muted)] hover:text-[var(--c-text)]">
        ← Apps
      </Link>
      <h1 className="mb-[20px] mt-[10px] text-[20px] font-semibold">New app</h1>
      <CreateAppForm />
    </div>
  );
}
