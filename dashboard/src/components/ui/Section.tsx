import type { ReactNode } from "react";
import { Card } from "./Card";

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="p-[18px]">
      <div className="mb-[14px] flex items-center justify-between gap-[10px]">
        <h2 className="text-[14px] font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}
