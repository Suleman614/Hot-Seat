interface ScorePopProps {
  amount: number;
  label: string;
}

export function ScorePop({ amount, label }: ScorePopProps) {
  const normalized = label.toLowerCase();
  const tone = normalized.includes("mimic")
    ? "text-violet-600"
    : normalized.includes("correct")
      ? "text-emerald-600"
      : "text-amber-600";
  const display = Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(1);
  return (
    <span className={`score-pop inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-bold ${tone}`}>
      +{display} {label.replace(/^\+\d+(\.\d+)?\s*/, "")}
    </span>
  );
}
