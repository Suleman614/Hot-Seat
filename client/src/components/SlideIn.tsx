import type { ReactNode } from "react";

interface SlideInProps {
  active: boolean;
  children: ReactNode;
  className?: string;
}

export function SlideIn({ active, children, className }: SlideInProps) {
  return (
    <div className={`${className ?? ""} ${active ? "slide-in-right" : "slide-in-hidden"}`}>{children}</div>
  );
}
