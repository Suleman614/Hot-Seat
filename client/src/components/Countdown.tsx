import { useEffect, useState } from "react";

interface CountdownProps {
  deadline?: number;
  label?: string;
}

export function Countdown({ deadline, label = "Time left" }: CountdownProps) {
  const [remaining, setRemaining] = useState<number>(deadline ? deadline - Date.now() : 0);

  useEffect(() => {
    if (!deadline) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      setRemaining(Math.max(0, deadline - Date.now()));
    };
    tick();
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, [deadline]);

  if (!deadline) return null;

  const seconds = Math.ceil(remaining / 1000);

  return (
    <div className="inline-flex items-center rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-white shadow-inner">
      <span className="mr-2 text-slate-300">{label}</span>
      <span className="font-semibold text-lime-300">{seconds}s</span>
    </div>
  );
}


