const PROMPT_MAX = 80;

const WHITESPACE = /\s+/gu;

const ELLIPSIS = "…";

const toShortPrompt = (text: string): string => {
  const flat = text.replaceAll(WHITESPACE, " ").trim();

  if (flat.length <= PROMPT_MAX) {
    return flat;
  }

  return `${flat.slice(0, PROMPT_MAX - ELLIPSIS.length).trimEnd()}${ELLIPSIS}`;
};

export { PROMPT_MAX, toShortPrompt };
