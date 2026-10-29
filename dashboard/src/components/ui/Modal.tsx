"use client";

import { useEffect, type ReactNode } from "react";
import { Card } from "./Card";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-[16px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-[440px] p-[18px] shadow-xl"
      >
        <div className="mb-[14px] flex items-center justify-between gap-[10px]">
          <h2 className="text-[14px] font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[var(--c-muted)] hover:text-[var(--c-text)]"
          >
            ✕
          </button>
        </div>
        {children}
      </Card>
    </div>
  );
}
