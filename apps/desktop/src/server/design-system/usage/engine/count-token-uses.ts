interface UsageToken {
  readonly aliasTexts: readonly string[];
  readonly file: string;
  readonly line: number;
  readonly name: string;
  readonly value: string;
}

interface UsageSite {
  readonly file: string;
  readonly line: number;
}

interface WordHit {
  readonly count: number;
  readonly lines: readonly number[];
}

type FileScan = ReadonlyMap<string, WordHit>;

interface UsageIndex {
  readonly classes: ReadonlyMap<string, readonly string[]>;
  readonly names: ReadonlySet<string>;
  readonly signature: string;
}

interface TokenUse {
  readonly fileCount: number;
  readonly name: string;
  readonly samples: readonly UsageSite[];
  readonly useCount: number;
  readonly value: string;
}

interface ScannedFile {
  readonly file: string;
  readonly scan: FileScan;
}

const MAX_SAMPLES = 3;

const MAX_WORD = 90;

const VAR_PATTERNS = [
  /var\(\s*(?<name>--[\w-]+)/gu,
  /-\(\s*(?<name>--[\w-]+)\s*\)/gu,
];

const WORD_PATTERN = /[^\s"'`{}()<>,;=|]+/gu;

const DECLARATION_PATTERN = /^\s*--[\w-]+\s*:/u;

const ALIAS_PATTERN = /var\(\s*(?<name>--[\w-]+)/gu;

const NEWLINE = 10;

const SHADOW = "shadow";

const TEXT = "text";

const FONT = "font";

const INSET_SHADOW = "inset-shadow";

const START = "-s";

const END = "-e";

const SIDES = ["-t", "-r", "-b", "-l"];

const EDGES = ["", ...SIDES, "-x", "-y", START, END];

const CORNERS = [
  "",
  ...SIDES,
  START,
  END,
  "-tl",
  "-tr",
  "-br",
  "-bl",
  "-ss",
  "-se",
  "-ee",
  "-es",
];

const COLOR_PREFIXES = [
  "bg",
  TEXT,
  "ring",
  "ring-offset",
  "outline",
  "fill",
  "stroke",
  "from",
  "via",
  "to",
  "divide",
  SHADOW,
  INSET_SHADOW,
  "accent",
  "caret",
  "decoration",
  "placeholder",
  "border",
  ...EDGES.map((edge) => `border${edge}`),
];

const SPACING_PREFIXES = [
  "p",
  "px",
  "py",
  "pt",
  "pr",
  "pb",
  "pl",
  "m",
  "mx",
  "my",
  "mt",
  "mr",
  "mb",
  "ml",
  "gap",
  "gap-x",
  "gap-y",
  "space-x",
  "space-y",
  "w",
  "h",
  "size",
  "inset",
  "top",
  "right",
  "bottom",
  "left",
];

const NAMESPACES: readonly (readonly [string, readonly string[]])[] = [
  ["font-weight", [FONT]],
  [INSET_SHADOW, [INSET_SHADOW]],
  ["drop-shadow", ["drop-shadow"]],
  ["text-shadow", ["text-shadow"]],
  ["color", COLOR_PREFIXES],
  ["radius", CORNERS.map((corner) => `rounded${corner}`)],
  ["spacing", SPACING_PREFIXES],
  [FONT, [FONT]],
  [TEXT, [TEXT]],
  [SHADOW, [SHADOW]],
  ["leading", ["leading"]],
  ["tracking", ["tracking"]],
  ["blur", ["blur"]],
  ["ease", ["ease"]],
  ["animate", ["animate"]],
  ["container", ["max-w", "min-w", "w", "basis"]],
  ["perspective", ["perspective"]],
  ["aspect", ["aspect"]],
];

const toNamespaceEntry = (
  name: string
): { readonly key: string; readonly prefixes: readonly string[] } | null => {
  for (const [namespace, prefixes] of NAMESPACES) {
    const lead = `--${namespace}-`;

    if (name.startsWith(lead) && !name.slice(lead.length).includes("--")) {
      return { key: name.slice(lead.length), prefixes };
    }
  }

  return null;
};

const toLineOf = (text: string): ((offset: number) => number) => {
  const starts: number[] = [0];

  for (let index = 0; index < text.length; index += 1) {
    if (text.codePointAt(index) === NEWLINE) {
      starts.push(index + 1);
    }
  }

  return (offset) => {
    let low = 0;
    let high = starts.length - 1;

    while (low < high) {
      const mid = Math.ceil((low + high) / 2);

      if ((starts.at(mid) ?? 0) <= offset) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    return low + 1;
  };
};

interface MutableHit {
  count: number;
  readonly lines: number[];
}

const insertHit = (
  hits: Map<string, MutableHit>,
  key: string,
  line: number
): void => {
  const known = hits.get(key) ?? null;

  if (known === null) {
    hits.set(key, { count: 1, lines: [line] });

    return;
  }

  known.count += 1;

  if (known.lines.length < MAX_SAMPLES) {
    known.lines.push(line);
  }
};

const toDeclarationLines = (text: string): ReadonlySet<number> => {
  const lines = new Set<number>();

  for (const [index, row] of text.split("\n").entries()) {
    if (DECLARATION_PATTERN.test(row)) {
      lines.add(index + 1);
    }
  }

  return lines;
};

const toBaseClass = (word: string): string => {
  let base = word;
  const colon = base.lastIndexOf(":");

  if (colon !== -1) {
    base = base.slice(colon + 1);
  }

  base = base.replace(/^!/u, "").replace(/!$/u, "");

  const slash = base.lastIndexOf("/");

  if (slash > 0) {
    base = base.slice(0, slash);
  }

  return base;
};

const toClassIndex = (
  tokens: readonly UsageToken[]
): ReadonlyMap<string, readonly string[]> => {
  const index = new Map<string, string[]>();

  for (const token of tokens) {
    const entry = toNamespaceEntry(token.name);

    if (entry !== null) {
      for (const prefix of entry.prefixes) {
        const className = `${prefix}-${entry.key}`;
        const known = index.get(className) ?? [];

        known.push(token.name);
        index.set(className, known);
      }
    }
  }

  return index;
};

const toSignature = (tokens: readonly UsageToken[]): string =>
  tokens.map((token) => token.name).join("|");

const toUsageIndex = (tokens: readonly UsageToken[]): UsageIndex => ({
  classes: toClassIndex(tokens),
  names: new Set(tokens.map((token) => token.name)),
  signature: toSignature(tokens),
});

interface ScanContext {
  readonly declared: ReadonlySet<number>;
  readonly hits: Map<string, MutableHit>;
  readonly index: UsageIndex;
  readonly isCss: boolean;
  readonly lineOf: (offset: number) => number;
  readonly text: string;
}

const toVarMatches = (
  text: string
): { readonly name: string; readonly offset: number }[] =>
  VAR_PATTERNS.flatMap((pattern) =>
    [...text.matchAll(pattern)].flatMap((match) => {
      const name = match.groups?.["name"] ?? null;

      if (name === null) {
        return [];
      }

      return [{ name, offset: match.index }];
    })
  );

const insertVarHits = (context: ScanContext): void => {
  const { declared, hits, index, isCss, lineOf, text } = context;

  for (const { name, offset } of toVarMatches(text)) {
    const line = lineOf(offset);
    const isDeclaration = isCss && declared.has(line);

    if (index.names.has(name) && !isDeclaration) {
      insertHit(hits, name, line);
    }
  }
};

const insertClassHits = (context: ScanContext): void => {
  const { hits, index, lineOf, text } = context;

  for (const match of text.matchAll(WORD_PATTERN)) {
    const [word = ""] = match;

    if (word.length <= MAX_WORD && word.includes("-")) {
      const names = index.classes.get(toBaseClass(word)) ?? [];

      for (const name of names) {
        insertHit(hits, name, lineOf(match.index));
      }
    }
  }
};

const toFileScan = (
  text: string,
  isCss: boolean,
  index: UsageIndex
): FileScan => {
  const declared = toDeclarationLines(text);
  const hits = new Map<string, MutableHit>();
  const lineOf = toLineOf(text);
  const context: ScanContext = { declared, hits, index, isCss, lineOf, text };

  insertVarHits(context);
  insertClassHits(context);

  return hits;
};

const toAliasRefs = (token: UsageToken): ReadonlySet<string> => {
  const refs = new Set<string>();

  for (const text of token.aliasTexts) {
    for (const match of text.matchAll(ALIAS_PATTERN)) {
      const ref = match.groups?.["name"] ?? null;

      if (ref !== null && ref !== token.name) {
        refs.add(ref);
      }
    }
  }

  return refs;
};

interface Tally {
  count: number;
  readonly files: Set<string>;
  readonly samples: UsageSite[];
}

const insertUse = (
  tallies: ReadonlyMap<string, Tally>,
  name: string,
  site: UsageSite,
  count: number
): void => {
  const tally = tallies.get(name) ?? null;

  if (tally === null) {
    return;
  }

  tally.count += count;
  tally.files.add(site.file);

  const isKnown = tally.samples.some(
    (sample) => sample.file === site.file && sample.line === site.line
  );

  if (tally.samples.length < MAX_SAMPLES && !isKnown) {
    tally.samples.push(site);
  }
};

const insertHits = (
  tallies: ReadonlyMap<string, Tally>,
  file: string,
  name: string,
  hit: WordHit
): void => {
  const extra = hit.count - hit.lines.length;

  for (const [index, line] of hit.lines.entries()) {
    let count = 1;

    if (index === 0) {
      count += extra;
    }

    insertUse(tallies, name, { file, line }, count);
  }
};

const insertScanned = (
  tallies: ReadonlyMap<string, Tally>,
  scanned: ScannedFile
): void => {
  for (const [name, hit] of scanned.scan) {
    insertHits(tallies, scanned.file, name, hit);
  }
};

const toTokenUses = (
  tokens: readonly UsageToken[],
  files: readonly ScannedFile[]
): TokenUse[] => {
  const tallies = new Map<string, Tally>(
    tokens.map((token) => [
      token.name,
      { count: 0, files: new Set<string>(), samples: [] },
    ])
  );

  for (const scanned of files) {
    insertScanned(tallies, scanned);
  }

  for (const token of tokens) {
    for (const ref of toAliasRefs(token)) {
      insertUse(tallies, ref, { file: token.file, line: token.line }, 1);
    }
  }

  return tokens.map((token) => {
    const tally = tallies.get(token.name) ?? null;

    return {
      fileCount: tally?.files.size ?? 0,
      name: token.name,
      samples: tally?.samples ?? [],
      useCount: tally?.count ?? 0,
      value: token.value,
    };
  });
};

export { toFileScan, toNamespaceEntry, toTokenUses, toUsageIndex };

export type {
  FileScan,
  ScannedFile,
  TokenUse,
  UsageIndex,
  UsageSite,
  UsageToken,
  WordHit,
};
