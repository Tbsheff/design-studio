import { ACCENT_FROM, ACCENT_TO, LONG_TEXTS, SHORT_TEXTS } from "./samples.js";

const PAD_RATIO = 0.3;

const accentOf = (letter: string): string => {
  const index = ACCENT_FROM.indexOf(letter);

  if (index === -1) {
    return letter;
  }

  return ACCENT_TO.charAt(index);
};

const pseudoLocalize = (text: string): string => {
  const mapped = Array.from(text, (letter) => accentOf(letter)).join("");

  const padding = "~".repeat(Math.ceil(text.length * PAD_RATIO));

  return `[${mapped}${padding}]`;
};

const longText = (rowIndex: number): string =>
  LONG_TEXTS[rowIndex % LONG_TEXTS.length] as string;

const shortText = (rowIndex: number): string =>
  SHORT_TEXTS[rowIndex % SHORT_TEXTS.length] as string;

export { longText, pseudoLocalize, shortText };
