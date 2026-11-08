const MAX_LABEL = 40;
const MAX_BRIEF_NAME = 60;
const BRIEF_WORDS = 4;
const LABEL_PATTERN = /^[a-z0-9-]{1,40}$/iu;
const DIGITS_PATTERN = /^\d+$/u;
const WORD_START = /(?<=^|[\s-])[a-z]/gu;
const NON_WORD = /[^\p{L}\p{N}\s-]/gu;
const WWW_PREFIX = /^www\./u;

const toTitleCase = (text: string): string =>
  text.replaceAll(WORD_START, (char) => char.toUpperCase());

const toNameFromUrl = (url: string): string | null => {
  try {
    const host = new URL(url).hostname.replace(WWW_PREFIX, "");
    const label = host.split(".")[0] ?? "";

    if (
      label.length > MAX_LABEL ||
      !LABEL_PATTERN.test(label) ||
      DIGITS_PATTERN.test(label)
    ) {
      return null;
    }

    return toTitleCase(label.replaceAll("-", " "));
  } catch {
    return null;
  }
};

const toNameFromBrief = (brief: string | undefined): string | null => {
  const words = (brief ?? "")
    .replaceAll(NON_WORD, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, BRIEF_WORDS);

  if (words.length === 0) {
    return null;
  }

  return toTitleCase(words.join(" ")).slice(0, MAX_BRIEF_NAME);
};

export { toNameFromBrief, toNameFromUrl, toTitleCase };
