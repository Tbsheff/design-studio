interface SpellingText {
  readonly selector: string;
  readonly text: string;
}

interface SpellingMiss {
  readonly count: number;
  readonly selectors: readonly string[];
  readonly word: string;
}

interface SpellingHitDraft extends SpellingMiss {
  readonly suggestions: readonly string[];
}

type IsCorrect = (word: string) => boolean;

type ToSuggestions = (word: string) => readonly string[];

interface Tally {
  readonly counts: Map<string, number>;
  readonly isCorrect: IsCorrect;
  readonly known: ReadonlySet<string>;
  readonly places: Map<string, Set<string>>;
  readonly verdicts: Map<string, string | null>;
}

const WORD_MIN = 3;
const POSSESSIVE_LENGTH = 2;
const SELECTORS_MAX = 20;
const SUGGESTIONS_MAX = 3;
const LINK_CHUNK = /:\/\/|@|\/|^www\.|\\/u;
const CODE_CHUNK = /[\p{N}_#]|\p{L}\.\p{L}/u;
const WORD_PART = /\p{L}[\p{L}'’-]*/gu;
const CAMEL_CASE = /\p{Ll}\p{Lu}/u;
const SUGGESTION_WORD = /^\p{L}[\p{L}'’-]*$/u;
const EDGE = new Set(["-", "'"]);

const toTrimmedEdges = (raw: string): string => {
  let start = 0;
  let end = raw.length;

  while (start < end && EDGE.has(raw.charAt(start))) {
    start += 1;
  }

  while (end > start && EDGE.has(raw.charAt(end - 1))) {
    end -= 1;
  }

  return raw.slice(start, end);
};

const toPlainWord = (raw: string): string => {
  const trimmed = toTrimmedEdges(raw.replaceAll("’", "'"));

  if (/'s$/iu.test(trimmed)) {
    return trimmed.slice(0, -POSSESSIVE_LENGTH);
  }

  return trimmed;
};

const isWordKept = (word: string): boolean => {
  if (word.length < WORD_MIN) {
    return false;
  }

  if (word === word.toUpperCase()) {
    return false;
  }

  return !CAMEL_CASE.test(word);
};

const toWordsOf = (chunk: string): string[] => {
  if (LINK_CHUNK.test(chunk) || CODE_CHUNK.test(chunk)) {
    return [];
  }

  const words: string[] = [];

  for (const raw of chunk.match(WORD_PART) ?? []) {
    const word = toPlainWord(raw);

    if (isWordKept(word)) {
      words.push(word);
    }
  }

  return words;
};

const toMissingPart = (word: string, tally: Tally): string | null => {
  const isOk = (part: string): boolean =>
    tally.known.has(part.toLowerCase()) || tally.isCorrect(part);

  if (isOk(word)) {
    return null;
  }

  const parts = word.split("-").filter((part) => part.length >= WORD_MIN);

  if (parts.length < 2) {
    return word;
  }

  return parts.find((part) => !isOk(part)) ?? null;
};

const updateTallyWord = (
  tally: Tally,
  word: string,
  selector: string
): void => {
  if (!tally.verdicts.has(word)) {
    tally.verdicts.set(word, toMissingPart(word, tally));
  }

  const missing = tally.verdicts.get(word) ?? null;

  if (missing === null) {
    return;
  }

  tally.counts.set(missing, (tally.counts.get(missing) ?? 0) + 1);
  tally.places.set(
    missing,
    (tally.places.get(missing) ?? new Set<string>()).add(selector)
  );
};

const updateTallyText = (tally: Tally, entry: SpellingText): void => {
  for (const chunk of entry.text.split(/\s+/u)) {
    for (const word of toWordsOf(chunk)) {
      updateTallyWord(tally, word, entry.selector);
    }
  }
};

const toMissOf = (tally: Tally, word: string, count: number): SpellingMiss => {
  const selectors = [...(tally.places.get(word) ?? [])].slice(0, SELECTORS_MAX);

  return { count, selectors, word };
};

const toSpellingMisses = (
  texts: readonly SpellingText[],
  isCorrect: IsCorrect,
  known: ReadonlySet<string>
): SpellingMiss[] => {
  const counts = new Map<string, number>();
  const places = new Map<string, Set<string>>();
  const verdicts = new Map<string, string | null>();
  const tally: Tally = { counts, isCorrect, known, places, verdicts };

  for (const entry of texts) {
    updateTallyText(tally, entry);
  }

  return [...tally.counts.entries()]
    .map(([word, count]) => toMissOf(tally, word, count))
    .toSorted((left, right) => {
      if (left.count !== right.count) {
        return right.count - left.count;
      }

      return left.word.localeCompare(right.word);
    });
};

const toMatchedCase = (word: string, suggestion: string): string => {
  const first = word.charAt(0);
  const rest = word.slice(1);

  if (first === first.toUpperCase() && rest === rest.toLowerCase()) {
    return suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
  }

  return suggestion;
};

const toSuggestionList = (
  word: string,
  candidates: readonly string[]
): string[] => {
  const found: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const suggestion = toMatchedCase(word, candidate);

    const isUsable =
      SUGGESTION_WORD.test(suggestion) &&
      suggestion.toLowerCase() !== word.toLowerCase() &&
      !seen.has(suggestion);

    if (isUsable) {
      found.push(suggestion);
      seen.add(suggestion);
    }

    if (found.length >= SUGGESTIONS_MAX) {
      break;
    }
  }

  return found;
};

const toSpellingHit = (
  miss: SpellingMiss,
  toSuggestions: ToSuggestions
): SpellingHitDraft => {
  const suggestions = toSuggestionList(miss.word, toSuggestions(miss.word));

  return { ...miss, suggestions };
};

export { toSpellingHit, toSpellingMisses };

export type { SpellingHitDraft, SpellingMiss, SpellingText };
