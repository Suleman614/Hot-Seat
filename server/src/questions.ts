export const QUESTION_BANK: string[] = [
  "What is a surprising fact about {hotSeat} that most people don't know?",
  "If {hotSeat} had to eat one meal for the rest of their life, what would it be?",
  "What is {hotSeatPossessive} most irrational fear?",
  "If {hotSeat} could instantly learn any skill, what would it be?",
  "Which fictional character does {hotSeat} relate to the most?",
  "What is a guilty pleasure song {hotSeat} knows by heart?",
  "Where would {hotSeat} travel if money and time were no issue?",
  "What is the best prank {hotSeat} has ever pulled off?",
  "If {hotSeat} could swap lives with someone for a day, who would it be?",
  "If {hotSeat} had to describe {randomPlayer} in one word, what would it be?",
  "What type of contest would {hotSeat} win between all the people in the room?",
  "If {hotSeat} were homeless, what would {hotSeat} write on their sign to get spare change?",
  "{hotSeat} is on the front page of next Sunday's local paper — what's the headline?",
  "What is the most embarrassing thing {hotSeat} has ever Googled?",
  "What job would {hotSeat} be absolutely horrible at?",
  "If {hotSeat} purchased their own island, what would they name it?",
  "What is the first thing {hotSeat} would do if they won the lottery?",
  "What is the smallest thing {hotSeat} is grateful for?",
  "If {hotSeat} were an inanimate object, what would they be and why?",
  "What is the most trivial thing {hotSeat} has a strong opinion about?",
  "If {hotSeat} could be any mythical creature, what would they be and why?",
  "What is {hotSeatPossessive} biggest non-academic, non-work-related accomplishment?",
  "What is {hotSeatPossessive} biggest academic or work-related accomplishment?",
  "What is something {hotSeat} has done, felt, or seen that they wish they could experience again for the first time?",
  "If {hotSeat} could choose when and how they die, at what age would they choose and how would they want to go?",
  "What has been the happiest moment of {hotSeatPossessive} life so far?",
  "What would {hotSeat} do for $100 that no one else in the room would do for $1000?",
  "If {hotSeat} could go back in time and give their younger self one piece of advice, what would it be?",
  "What’s a phrase {hotSeat} says way too often?",
  "If {hotSeat} could instantly master any silly skill, what would it be?",
  "How does {hotSeat} usually handle stress?",
  "Who would {hotSeat} call if they needed advice?",
  "What nickname does {hotSeat} think would fit {randomPlayer} perfectly?",
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
