const FIRST_PREFIX_SCORE = 12;
const PREFIX_SCORE = 10;
const SPAN_DIVISOR = 100;
const LENGTH_DIVISOR = 200;

interface Ranked<T> {
  item: T;
  score: number;
  marks: number[];
}

const words = (text: string): { word: string; at: number }[] => {
  const out: { word: string; at: number }[] = [];
  const re = /[\p{L}\p{N}]+/gu;

  for (let match = re.exec(text); match; match = re.exec(text)) {
    out.push({ word: match[0].toLowerCase(), at: match.index });
  }

  return out;
};

const subsequence = (token: string, text: string): number[] | null => {
  const marks: number[] = [];
  let from = 0;

  for (const ch of token) {
    const at = text.indexOf(ch, from);

    if (at === -1) {
      return null;
    }

    marks.push(at);
    from = at + 1;
  }

  return marks;
};

interface TokenContext {
  title: string;
  list: { word: string; at: number }[];
  used: Set<number>;
  extra: string;
}

const tokenScore = (
  token: string,
  { title, list, used, extra }: TokenContext
): { score: number; marks: number[] } | null => {
  const prefix = list.findIndex(
    (entry, idx) => !used.has(idx) && entry.word.startsWith(token)
  );

  if (prefix !== -1) {
    used.add(prefix);
    const at = list[prefix]?.at ?? 0;

    return {
      score: prefix === 0 ? FIRST_PREFIX_SCORE : PREFIX_SCORE,
      marks: Array.from({ length: token.length }, (_, idxNext) => at + idxNext),
    };
  }

  const inside = title.indexOf(token);

  if (inside !== -1) {
    return {
      score: 6,
      marks: Array.from(
        { length: token.length },
        (_, indexNext) => inside + indexNext
      ),
    };
  }

  if (extra.split(/\s+/u).some((wide) => wide.startsWith(token))) {
    return { score: 5, marks: [] };
  }

  const loose = subsequence(token, title);

  if (loose) {
    return {
      score: 2 - (loose.at(-1)! - loose[0]!) / SPAN_DIVISOR,
      marks: loose,
    };
  }

  return null;
};

const rank = <T>(
  items: readonly T[],
  query: string,
  text: (item: T) => { title: string; keywords?: string }
): Ranked<T>[] => {
  const tokens = query.toLowerCase().split(/\s+/u).filter(Boolean);

  if (tokens.length === 0) {
    return items.map((item) => ({ item, score: 0, marks: [] }));
  }

  const out: Ranked<T>[] = [];

  for (const item of items) {
    const { title, keywords = "" } = text(item);
    const lower = title.toLowerCase();
    const list = words(title);
    const used = new Set<number>();
    let score = 0;
    const marks: number[] = [];
    let ok = true;

    for (const token of tokens) {
      const hit = tokenScore(token, {
        extra: keywords.toLowerCase(),
        title: lower,
        list,
        used,
      });

      if (!hit) {
        ok = false;
        break;
      }

      score += hit.score;
      marks.push(...hit.marks);
    }

    if (ok) {
      out.push({
        item,
        score: score - title.length / LENGTH_DIVISOR,
        marks: [...new Set(marks)].sort((first, second) => first - second),
      });
    }
  }

  return out.sort((left, right) => right.score - left.score);
};

export { rank };

export type { Ranked };
