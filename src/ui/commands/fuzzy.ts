export interface Ranked<T> {
  item: T;
  score: number;
  marks: number[];
}

function words(text: string): { word: string; at: number }[] {
  const out: { word: string; at: number }[] = [];
  const re = /[\p{L}\p{N}]+/gu;
  for (let m = re.exec(text); m; m = re.exec(text)) out.push({ word: m[0].toLowerCase(), at: m.index });
  return out;
}

function subsequence(token: string, text: string): number[] | null {
  const marks: number[] = [];
  let from = 0;
  for (const ch of token) {
    const at = text.indexOf(ch, from);
    if (at < 0) return null;
    marks.push(at);
    from = at + 1;
  }
  return marks;
}

function tokenScore(token: string, title: string, list: { word: string; at: number }[], used: Set<number>, extra: string): { score: number; marks: number[] } | null {
  const prefix = list.findIndex((w, i) => !used.has(i) && w.word.startsWith(token));
  if (prefix >= 0) {
    used.add(prefix);
    const at = list[prefix]?.at ?? 0;
    return { score: prefix === 0 ? 12 : 10, marks: Array.from({ length: token.length }, (_, i) => at + i) };
  }
  const inside = title.indexOf(token);
  if (inside >= 0) return { score: 6, marks: Array.from({ length: token.length }, (_, i) => inside + i) };
  if (extra.split(/\s+/).some((w) => w.startsWith(token))) return { score: 5, marks: [] };
  const loose = subsequence(token, title);
  if (loose) return { score: 2 - (loose[loose.length - 1]! - loose[0]!) / 100, marks: loose };
  return null;
}

export function rank<T>(items: readonly T[], query: string, text: (item: T) => { title: string; keywords?: string }): Ranked<T>[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return items.map((item) => ({ item, score: 0, marks: [] }));
  const out: Ranked<T>[] = [];
  for (const item of items) {
    const { title, keywords = '' } = text(item);
    const lower = title.toLowerCase();
    const list = words(title);
    const used = new Set<number>();
    let score = 0;
    const marks: number[] = [];
    let ok = true;
    for (const token of tokens) {
      const hit = tokenScore(token, lower, list, used, keywords.toLowerCase());
      if (!hit) {
        ok = false;
        break;
      }
      score += hit.score;
      marks.push(...hit.marks);
    }
    if (ok) out.push({ item, score: score - title.length / 200, marks: [...new Set(marks)].sort((a, b) => a - b) });
  }
  return out.sort((a, b) => b.score - a.score);
}
