interface ExportToken {
  readonly cssVar: string;
  readonly dark: string | null;
  readonly path: string;
  readonly type: string;
  readonly value: string;
}

interface PortableValue {
  readonly aliasPath: string | null;
  readonly aliasVar: string | null;
  readonly text: string;
}

interface PortableToken {
  readonly cssVar: string;
  readonly dark: PortableValue | null;
  readonly group: string;
  readonly light: PortableValue;
  readonly path: string;
  readonly segments: readonly string[];
  readonly type: string;
}

interface SkippedToken {
  readonly name: string;
  readonly reason: string;
}

interface FormatOutput {
  readonly aliasCount: number;
  readonly skipped: readonly SkippedToken[];
  readonly text: string;
  readonly tokenCount: number;
}

type ExportModes = "dark" | "light" | "light-dark";

interface PortableOptions {
  readonly groups: readonly string[] | null;
  readonly modes: ExportModes;
}

const WHOLE_VAR = /^var\(\s*(?<name>--[\w-]+)\s*\)$/u;

const MAX_ALIAS_DEPTH = 16;

const toAliasVar = (value: string): string | null => {
  const match = WHOLE_VAR.exec(value.trim());

  return match?.groups?.name ?? null;
};

const toRawText = (token: ExportToken, isDark: boolean): string => {
  if (isDark) {
    return token.dark ?? token.value;
  }

  return token.value;
};

const toResolvedText = (
  byVar: ReadonlyMap<string, ExportToken>,
  token: ExportToken,
  isDark: boolean,
  depth: number
): string => {
  const raw = toRawText(token, isDark);
  const target = byVar.get(toAliasVar(raw) ?? "");

  if (!target || depth >= MAX_ALIAS_DEPTH) {
    return raw;
  }

  return toResolvedText(byVar, target, isDark, depth + 1);
};

const toPortableValue = (
  byVar: ReadonlyMap<string, ExportToken>,
  selected: ReadonlySet<string>,
  token: ExportToken,
  isDark: boolean
): PortableValue => {
  const aliasVar = toAliasVar(toRawText(token, isDark));
  const target = byVar.get(aliasVar ?? "");
  const text = toResolvedText(byVar, token, isDark, 0);

  if (!target || !selected.has(target.cssVar)) {
    return { aliasPath: null, aliasVar: null, text };
  }

  return { aliasPath: target.path, aliasVar: target.cssVar, text };
};

const isSameValue = (left: PortableValue, right: PortableValue): boolean => {
  if (left.aliasPath !== null || right.aliasPath !== null) {
    return left.aliasPath === right.aliasPath;
  }

  return left.text === right.text;
};

const toGroupOf = (path: string): string => path.split(".")[0] ?? path;

const isSelected = (
  token: ExportToken,
  groups: readonly string[] | null
): boolean => {
  if (groups === null || groups.length === 0) {
    return true;
  }

  return groups.includes(toGroupOf(token.path));
};

const toDarkValue = (
  light: PortableValue,
  dark: PortableValue
): PortableValue | null => {
  if (isSameValue(light, dark)) {
    return null;
  }

  return dark;
};

const toPortableToken = (
  byVar: ReadonlyMap<string, ExportToken>,
  selected: ReadonlySet<string>,
  token: ExportToken,
  modes: ExportModes
): PortableToken => {
  const light = toPortableValue(byVar, selected, token, false);
  const dark = toPortableValue(byVar, selected, token, true);

  const base = {
    cssVar: token.cssVar,
    group: toGroupOf(token.path),
    path: token.path,
    segments: token.path.split("."),
    type: token.type,
  };

  if (modes === "dark") {
    return { ...base, dark: null, light: dark };
  }

  if (modes === "light") {
    return { ...base, dark: null, light };
  }

  return { ...base, dark: toDarkValue(light, dark), light };
};

const toPortableTokens = (
  tokens: readonly ExportToken[],
  options: PortableOptions
): readonly PortableToken[] => {
  const byVar = new Map(tokens.map((token) => [token.cssVar, token]));
  const chosen = tokens.filter((token) => isSelected(token, options.groups));
  const selected = new Set(chosen.map((token) => token.cssVar));

  return chosen.map((token) =>
    toPortableToken(byVar, selected, token, options.modes)
  );
};

const toAliasCount = (
  isKept: (value: PortableValue) => boolean,
  tokens: readonly PortableToken[]
): number => {
  let total = 0;

  for (const token of tokens) {
    total += Number(isKept(token.light));

    if (token.dark !== null) {
      total += Number(isKept(token.dark));
    }
  }

  return total;
};

export { toAliasCount, toAliasVar, toPortableTokens };

export type {
  ExportModes,
  ExportToken,
  FormatOutput,
  PortableOptions,
  PortableToken,
  PortableValue,
  SkippedToken,
};
