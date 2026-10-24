function isBoundary(text: string, index: number): boolean {
  if (index === 0) return true;
  const before = text[index - 1] ?? '';
  const here = text[index] ?? '';
  return /[\s/._\-]/.test(before) || (before === before.toLowerCase() && here !== here.toLowerCase());
}

function scoreIn(text: string, query: string): number | null {
  const lower = text.toLowerCase();
  let score = 0;
  let from = 0;
  let last = -2;
  for (const char of query) {
    const index = lower.indexOf(char, from);
    if (index === -1) return null;
    score += 1;
    if (index === last + 1) score += 3;
    if (isBoundary(text, index)) score += 4;
    score -= Math.min(3, (index - from) * 0.1);
    last = index;
    from = index + 1;
  }
  return score - text.length * 0.01;
}

export function fuzzyScore(candidate: string, rawQuery: string): number | null {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return 0;
  const base = candidate.split('/').pop() ?? candidate;
  const onBase = scoreIn(base, query);
  if (onBase !== null) return onBase + 10 + (base.toLowerCase().startsWith(query) ? 6 : 0);
  return scoreIn(candidate, query);
}

export function fuzzyRank<T>(items: readonly T[], query: string, key: (item: T) => string, limit = 50): T[] {
  const scored: { item: T; score: number; index: number }[] = [];
  items.forEach((item, index) => {
    const score = fuzzyScore(key(item), query);
    if (score !== null) scored.push({ item, score, index });
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.slice(0, limit).map((entry) => entry.item);
}
