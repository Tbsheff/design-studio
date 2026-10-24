export const CLARIFY_WORD_LIMIT = 12;

export function wordCount(prompt: string): number {
  return prompt.trim().split(/\s+/).filter(Boolean).length;
}

export function needsQuestions(prompt: string): boolean {
  const count = wordCount(prompt);
  return count > 0 && count < CLARIFY_WORD_LIMIT;
}

export function formatAnswers(prompt: string, answers: Array<{ question: string; answer: string }>): string {
  const lines = answers.filter((item) => item.answer.trim() !== '').map((item) => `- ${item.question} ${item.answer.trim()}`);
  return lines.length === 0 ? prompt.trim() : `${prompt.trim()}\n\nAnswers to your questions:\n${lines.join('\n')}`;
}
