import { useEffect, useState } from "react";
import type { ReactNode } from "react";

interface ScreenFadeProps {
  activeKey: string;
  children: ReactNode;
  className?: string;
  durationMs?: number;
}

export function ScreenFade({ activeKey, children, className, durationMs = 300 }: ScreenFadeProps) {
  const [renderedKey, setRenderedKey] = useState(activeKey);
  const [renderedChildren, setRenderedChildren] = useState(children);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (activeKey === renderedKey) {
      setRenderedChildren(children);
      return;
    }
    setFadingOut(true);
    const timeout = window.setTimeout(() => {
      setRenderedKey(activeKey);
      setRenderedChildren(children);
      setFadingOut(false);
    }, durationMs);
    return () => window.clearTimeout(timeout);
  }, [activeKey, children, durationMs, renderedKey]);

  return (
    <div
      className={`${className ?? ""} transition-opacity duration-300 ${fadingOut ? "opacity-0" : "opacity-100"}`}
    >
      {renderedChildren}
    </div>
  );
}
