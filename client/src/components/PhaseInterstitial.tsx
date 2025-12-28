import { Countdown } from "./Countdown";

interface PhaseInterstitialProps {
  title: string;
  subtitle?: string;
  countdownSeconds?: number;
  countdownKey?: number;
  onCountdownComplete?: () => void;
}

export function PhaseInterstitial({
  title,
  subtitle,
  countdownSeconds,
  countdownKey,
  onCountdownComplete,
}: PhaseInterstitialProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/30 bg-white/10 px-6 py-8 text-center text-white shadow-2xl interstitial-fade">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">Phase update</p>
        <h3 className="mt-3 text-3xl font-black">{title}</h3>
        {subtitle && <p className="mt-2 text-sm font-medium text-white/80">{subtitle}</p>}
        {typeof countdownSeconds === "number" && (
          <div className="mt-6 flex items-center justify-center">
            <Countdown
              key={countdownKey ?? countdownSeconds}
              seconds={countdownSeconds}
              onComplete={onCountdownComplete}
              className="text-white"
            />
          </div>
        )}
      </div>
    </div>
  );
}
