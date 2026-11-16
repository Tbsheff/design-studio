type SpacingKind = "off-scale" | "tokenable" | "uneven";

interface SpacingFinding {
  readonly detail: string;
  readonly file: string;
  readonly kind: SpacingKind;
  readonly line: number;
  readonly selector: string;
}

interface CssDeclaration {
  readonly line: number;
  readonly property: string;
  readonly selector: string;
  readonly value: string;
}

interface ScanState {
  buffer: string;
  line: number;
  readonly selectors: string[];
  startLine: number;
}

type SpacingScale = ReadonlyMap<string, number>;

const SPACING_PROPERTIES: ReadonlySet<string> = new Set([
  "column-gap",
  "gap",
  "margin",
  "margin-block",
  "margin-block-end",
  "margin-block-start",
  "margin-bottom",
  "margin-inline",
  "margin-inline-end",
  "margin-inline-start",
  "margin-left",
  "margin-right",
  "margin-top",
  "padding",
  "padding-block",
  "padding-block-end",
  "padding-block-start",
  "padding-bottom",
  "padding-inline",
  "padding-inline-end",
  "padding-inline-start",
  "padding-left",
  "padding-right",
  "padding-top",
  "row-gap",
]);

const PIXEL_PART = /^-?(?<amount>\d+(?:\.\d+)?)px$/u;

const SCALE_TOKEN = /--(?<name>s-[\d-]+): (?<amount>\d+(?:\.\d+)?)px/gu;

const VAR_PART = /^var\(--(?<name>s-[\d-]+)\)$/u;

const UNEVEN_MIN_PX = 4;

const FOUR_SIDES = 4;

const LEFT_INDEX = 3;

const toSpacingScale = (tokensCss: string): SpacingScale => {
  const scale = new Map<string, number>();

  for (const match of tokensCss.matchAll(SCALE_TOKEN)) {
    scale.set(match.groups?.name ?? "", Number(match.groups?.amount));
  }

  return scale;
};

const toUncommented = (css: string): string => {
  let text = css;
  let start = text.indexOf("/*");

  while (start !== -1) {
    const end = text.indexOf("*/", start + 2);
    let stop = text.length;

    if (end !== -1) {
      stop = end + 2;
    }

    const blank = text.slice(start, stop).replaceAll(/[^\n]/gu, " ");

    text = text.slice(0, start) + blank + text.slice(stop);
    start = text.indexOf("/*", stop);
  }

  return text;
};

const toDeclaration = (state: ScanState): CssDeclaration | null => {
  const colon = state.buffer.indexOf(":");

  if (colon === -1 || state.selectors.length === 0) {
    return null;
  }

  return {
    line: state.startLine,
    property: state.buffer.slice(0, colon).trim(),
    selector: state.selectors.at(-1) ?? "",
    value: state.buffer.slice(colon + 1).trim(),
  };
};

const runScanChar = (
  state: ScanState,
  char: string,
  declarations: CssDeclaration[]
): void => {
  if (char === "{") {
    state.selectors.push(state.buffer.trim().split("\n").at(-1)?.trim() ?? "");
    state.buffer = "";
  } else if (char === "}" || char === ";") {
    const declaration = toDeclaration(state);

    if (declaration !== null) {
      declarations.push(declaration);
    }

    if (char === "}") {
      state.selectors.pop();
    }

    state.buffer = "";
  } else {
    if (state.buffer.trim() === "" && char.trim() !== "") {
      state.startLine = state.line;
    }

    state.buffer += char;
  }
};

const toDeclarations = (css: string): CssDeclaration[] => {
  const declarations: CssDeclaration[] = [];
  const state: ScanState = { buffer: "", line: 1, selectors: [], startLine: 1 };

  for (const char of toUncommented(css)) {
    if (char === "\n") {
      state.line += 1;
    }

    runScanChar(state, char, declarations);
  }

  return declarations;
};

const toTokenName = (scale: SpacingScale, pixels: number): string | null => {
  for (const [name, value] of scale) {
    if (value === pixels) {
      return name;
    }
  }

  return null;
};

const toPartFinding = (
  part: string,
  scale: SpacingScale
): Pick<SpacingFinding, "detail" | "kind"> | null => {
  const amount = Number(PIXEL_PART.exec(part)?.groups?.amount ?? 0);

  if (amount === 0) {
    return null;
  }

  const token = toTokenName(scale, amount);

  if (token === null) {
    return { detail: `${part} is not on the --s-* scale`, kind: "off-scale" };
  }

  return { detail: `${part} equals var(--${token})`, kind: "tokenable" };
};

const toPixels = (part: string, scale: SpacingScale): number | null => {
  const pixel = PIXEL_PART.exec(part)?.groups?.amount ?? null;

  if (pixel !== null) {
    return Number(pixel);
  }

  const token = VAR_PART.exec(part)?.groups?.name ?? null;

  if (token === null) {
    return null;
  }

  return scale.get(token) ?? null;
};

const toUnevenDetail = (
  declaration: CssDeclaration,
  parts: readonly string[],
  scale: SpacingScale
): string | null => {
  if (declaration.property !== "padding" || parts.length !== FOUR_SIDES) {
    return null;
  }

  const left = toPixels(parts[LEFT_INDEX] ?? "", scale);
  const right = toPixels(parts[1] ?? "", scale);

  if (left === null || right === null || left === 0 || right === 0) {
    return null;
  }

  if (Math.abs(left - right) < UNEVEN_MIN_PX) {
    return null;
  }

  return `left ${left}px, right ${right}px (${declaration.value})`;
};

const toDeclarationFindings = (
  file: string,
  declaration: CssDeclaration,
  scale: SpacingScale
): SpacingFinding[] => {
  if (!SPACING_PROPERTIES.has(declaration.property)) {
    return [];
  }

  const parts = declaration.value.split(/\s+/u);
  const base = { file, line: declaration.line, selector: declaration.selector };

  const findings = parts.flatMap((part) => {
    const found = toPartFinding(part, scale);

    if (found === null) {
      return [];
    }

    return [{ ...base, ...found }];
  });

  const uneven = toUnevenDetail(declaration, parts, scale);

  if (uneven !== null) {
    findings.push({ ...base, detail: uneven, kind: "uneven" });
  }

  return findings;
};

const toSpacingFindings = (
  file: string,
  css: string,
  scale: SpacingScale
): SpacingFinding[] =>
  toDeclarations(css).flatMap((declaration) =>
    toDeclarationFindings(file, declaration, scale)
  );

export { toSpacingFindings, toSpacingScale };

export type { SpacingFinding, SpacingKind, SpacingScale };
