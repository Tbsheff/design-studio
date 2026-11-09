const LINE_MAX = 200;

const BULLET = /^\s*(?:[-*+]|\d+[.)])\s+/u;

const NONE = /^none\b/iu;

const toCleanLine = (line: string): string =>
  line.replace(BULLET, "").replaceAll("**", "").trim();

const toRuleLine = (reply: string): string | null => {
  const lines = reply
    .split("\n")
    .map((line) => toCleanLine(line))
    .filter((line) => line !== "");

  const first = lines.at(0) ?? "";

  if (first === "" || NONE.test(first)) {
    return null;
  }

  return first.slice(0, LINE_MAX);
};

export { toRuleLine };
