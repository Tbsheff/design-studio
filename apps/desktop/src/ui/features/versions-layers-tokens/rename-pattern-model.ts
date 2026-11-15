const RENAME_MANY_MAX = 50;
const RENAME_NAME_MAX = 80;
const PREVIEW_COUNT = 5;
const PAD_WIDTH = 2;
const TOKEN = /\$(?<token>&|nn|n|N)/gu;

interface PatternRow {
  readonly id: number;
  readonly name: string;
}

interface PatternPreview {
  readonly more: number;
  readonly rows: readonly PatternRow[];
}

const toTokenValue = (
  token: string,
  name: string,
  index: number,
  count: number
): string => {
  if (token === "&") {
    return name;
  }

  if (token === "nn") {
    return String(index + 1).padStart(PAD_WIDTH, "0");
  }

  if (token === "N") {
    return String(count - index);
  }

  return String(index + 1);
};

const toPatternName = (
  pattern: string,
  name: string,
  index: number,
  count: number
): string =>
  pattern.replaceAll(TOKEN, (_match, token: string) =>
    toTokenValue(token, name, index, count)
  );

const toPatternNames = (
  names: readonly string[],
  pattern: string,
  find: string,
  replace: string
): string[] =>
  names.map((name, index) => {
    if (find === "") {
      return toPatternName(pattern, name, index, names.length)
        .trim()
        .slice(0, RENAME_NAME_MAX);
    }

    return name.replaceAll(find, replace).trim().slice(0, RENAME_NAME_MAX);
  });

const toPatternPreview = (
  ids: readonly number[],
  names: readonly string[]
): PatternPreview => ({
  more: Math.max(0, names.length - PREVIEW_COUNT),
  rows: names
    .slice(0, PREVIEW_COUNT)
    .map((name, index) => ({ id: ids[index] ?? index, name })),
});

export { RENAME_MANY_MAX, toPatternNames, toPatternPreview };

export type { PatternPreview, PatternRow };
