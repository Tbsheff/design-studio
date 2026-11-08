const FIRST_PREFIX_SCORE = 12;
const PREFIX_SCORE = 10;
const INSIDE_SCORE = 6;
const EXTRA_SCORE = 5;
const LOOSE_SCORE = 2;
const SPAN_DIVISOR = 100;
const LENGTH_DIVISOR = 200;

interface Ranked<Entry> {
  item: Entry;
  marks: number[];
  score: number;
}

interface Word {
  at: number;
  word: string;
}

const toWords = (text: string): Word[] => {
  const out: Word[] = [];
  const pattern = /[\p{L}\p{N}]+/gu;

  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    out.push({ at: match.index, word: match[0].toLowerCase() });
  }

  return out;
};

const toSubsequence = (token: string, text: string): number[] | null => {
  const marks: number[] = [];
  let from = 0;

  for (const char of token) {
    const at = text.indexOf(char, from);

    if (at === -1) {
      return null;
    }

    marks.push(at);
    from = at + 1;
  }

  return marks;
};

const toRange = (start: number, length: number): number[] =>
  [...Array.from({ length }).keys()].map((offset) => start + offset);

interface TokenContext {
  extra: string;
  list: Word[];
  title: string;
  used: Set<number>;
}

const toTokenScore = (
  token: string,
  { extra, list, title, used }: TokenContext
): { marks: number[]; score: number } | null => {
  const prefix = list.findIndex(
    (entry, index) => !used.has(index) && entry.word.startsWith(token)
  );

  if (prefix !== -1) {
    used.add(prefix);
    const at = list[prefix]?.at ?? 0;
    let score = PREFIX_SCORE;

    if (prefix === 0) {
      score = FIRST_PREFIX_SCORE;
    }

    return { marks: toRange(at, token.length), score };
  }

  const inside = title.indexOf(token);

  if (inside !== -1) {
    return { marks: toRange(inside, token.length), score: INSIDE_SCORE };
  }

  if (extra.split(/\s+/u).some((wide) => wide.startsWith(token))) {
    return { marks: [], score: EXTRA_SCORE };
  }

  const loose = toSubsequence(token, title);

  if (loose) {
    const last = loose.at(-1) ?? 0;
    const first = loose[0] ?? 0;

    return {
      marks: loose,
      score: LOOSE_SCORE - (last - first) / SPAN_DIVISOR,
    };
  }

  return null;
};

const rank = <Entry>(
  items: readonly Entry[],
  query: string,
  text: (item: Entry) => { keywords?: string; title: string }
): Ranked<Entry>[] => {
  const tokens = query.toLowerCase().split(/\s+/u).filter(Boolean);

  if (tokens.length === 0) {
    return items.map((item) => ({ item, marks: [], score: 0 }));
  }

  const out: Ranked<Entry>[] = [];

  for (const item of items) {
    const { keywords = "", title: rawTitle } = text(item);
    const title = rawTitle.toLowerCase();
    const extra = keywords.toLowerCase();
    const list = toWords(rawTitle);
    const used = new Set<number>();
    let score = 0;
    const marks: number[] = [];
    let ok = true;

    for (const token of tokens) {
      const hit = toTokenScore(token, { extra, list, title, used });

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
        marks: [...new Set(marks)].toSorted((first, second) => first - second),
        score: score - rawTitle.length / LENGTH_DIVISOR,
      });
    }
  }

  return out.toSorted((left, right) => right.score - left.score);
};

export { rank };

export type { Ranked };
