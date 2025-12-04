export const QUESTION_BANK: string[] = [
  "What is a surprising fact about you that most people don't know?",
  "If you had to eat one meal for the rest of your life, what would it be?",
  "What is your most irrational fear?",
  "If you could instantly learn any skill, what would it be?",
  "What was your most embarrassing moment in school?",
  "Which fictional character do you relate to the most?",
  "What is a guilty pleasure song you know by heart?",
  "Where would you travel if money and time were no issue?",
  "What is the best prank you have ever pulled off?",
  "If you could swap lives with someone for a day, who would it be?",
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


