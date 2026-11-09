const WORD_PART = /\p{L}[\p{L}'’-]*/gu;

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

const toPlain = (raw: string): string =>
  toTrimmedEdges(raw.replaceAll("’", "'")).toLowerCase();

const toKnownWords = (texts: readonly string[]): Set<string> => {
  const known = new Set<string>();

  for (const text of texts) {
    for (const raw of text.match(WORD_PART) ?? []) {
      const word = toPlain(raw);

      known.add(word);
      known.add(word.replace(/'s$/u, ""));

      for (const part of word.split("-")) {
        known.add(part);
      }
    }
  }

  return known;
};

export { toKnownWords };
