import { useEffect, useRef, useState } from "react";

interface CountdownProps {
  deadline?: number;
  label?: string;
  seconds?: number;
  onComplete?: () => void;
  className?: string;
}

export function Countdown({ deadline, label = "Time left", seconds, onComplete, className }: CountdownProps) {
  const [remaining, setRemaining] = useState<number>(deadline ? deadline - Date.now() : 0);
  const [tick, setTick] = useState<number>(seconds ?? 0);
  const completedRef = useRef(false);

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

  useEffect(() => {
    if (typeof seconds !== "number") {
      return;
    }
    completedRef.current = false;
    setTick(seconds);
    if (seconds <= 0) {
      return;
    }
    const interval = window.setInterval(() => {
      setTick((prev) => {
        if (prev <= 1) {
          if (!completedRef.current) {
            completedRef.current = true;
            onComplete?.();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [seconds, onComplete]);

  if (typeof seconds === "number") {
    if (tick <= 0) return null;
    return (
      <div className={`countdown-pop text-5xl font-black ${className ?? ""}`} key={tick}>
        {tick}
      </div>
    );
  }

  if (!deadline) return null;

  const remainingSeconds = Math.ceil(remaining / 1000);

  return (
    <div className="inline-flex items-center rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-white shadow-inner">
      <span className="mr-2 text-slate-300">{label}</span>
      <span className="font-semibold text-lime-300">{remainingSeconds}s</span>
    </div>
  );
}
