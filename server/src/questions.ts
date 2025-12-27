export const QUESTION_BANK: string[] = [
  "What is a surprising fact about {hotSeat} that most people don't know?",
  "If {hotSeat} had to eat one meal for the rest of their life, what would it be?",
  "What is {hotSeatPossessive} most irrational fear?",
  "If {hotSeat} could instantly learn any skill, what would it be?",
  "What was {hotSeatPossessive} most embarrassing moment in school?",
  "Which fictional character does {hotSeat} relate to the most?",
  "What is a guilty pleasure song {hotSeat} knows by heart?",
  "Where would {hotSeat} travel if money and time were no issue?",
  "What is the best prank {hotSeat} has ever pulled off?",
  "If {hotSeat} could swap lives with someone for a day, who would it be?",
];

export function getShuffledQuestions(): string[] {
  const clone = [...QUESTION_BANK];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = clone[i]!;
    clone[i] = clone[j]!;
    clone[j] = temp;
  }
  return clone;
}

