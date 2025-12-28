type SfxType = "chime" | "click" | "whoosh" | "sparkle" | "ding" | "outro";

let audioContext: AudioContext | null = null;

const ensureContext = () => {
  if (typeof window === "undefined") {
    return null;
  }
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
};

const playTone = (frequency: number, duration: number, type: OscillatorType, gainValue: number) => {
  const ctx = ensureContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = gainValue;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  oscillator.stop(ctx.currentTime + duration);
};

export const playSfx = (type: SfxType) => {
  switch (type) {
    case "chime":
      playTone(660, 0.3, "sine", 0.06);
      playTone(880, 0.25, "sine", 0.05);
      break;
    case "click":
      playTone(520, 0.08, "square", 0.04);
      break;
    case "whoosh":
      playTone(240, 0.35, "triangle", 0.05);
      break;
    case "sparkle":
      playTone(1200, 0.25, "sine", 0.05);
      playTone(900, 0.2, "sine", 0.04);
      break;
    case "ding":
      playTone(740, 0.2, "sine", 0.05);
      break;
    case "outro":
      playTone(520, 0.35, "sine", 0.05);
      playTone(780, 0.3, "sine", 0.04);
      break;
    default:
      break;
  }
};
