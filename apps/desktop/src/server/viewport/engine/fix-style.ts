const OPEN_TAG = ["<", "style data-studio-responsive", ">"].join("");

const CLOSE_TAG = "</style>";

const HEAD_END = "</head>";

const BLOCK = /<style data-studio-responsive>(?<body>[\s\S]*?)<\/style>/u;

const toBlock = (lines: readonly string[]): string =>
  [OPEN_TAG, ...lines, CLOSE_TAG].join("\n");

const toBlockLines = (code: string): readonly string[] => {
  const body = BLOCK.exec(code)?.groups?.["body"] ?? "";

  return body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
};

const toInserted = (code: string, lines: readonly string[]): string => {
  const head = code.indexOf(HEAD_END);

  if (head === -1) {
    return [toBlock(lines), code].join("\n");
  }

  return [code.slice(0, head), toBlock(lines), "\n", code.slice(head)].join("");
};

const toStyledHtml = (code: string, add: readonly string[]): string => {
  if (add.length === 0) {
    return code;
  }

  const known = toBlockLines(code);
  const seen = new Set(known);
  const lines = [...known, ...add.filter((line) => !seen.has(line))];

  if (BLOCK.test(code)) {
    return code.replace(BLOCK, () => toBlock(lines));
  }

  return toInserted(code, lines);
};

const toOffset = (code: string, line: number, col: number): number => {
  let offset = 0;

  for (let at = 1; at < line; at += 1) {
    const next = code.indexOf("\n", offset);

    if (next === -1) {
      return code.length;
    }

    offset = next + 1;
  }

  return offset + Math.max(0, col - 1);
};

export { toOffset, toStyledHtml };
