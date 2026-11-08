const CHART_TOKENS = [
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
] as const;

const NEAREST_TOKENS = [
  "--primary",
  "--accent",
  "--secondary",
  "--success",
  "--warning",
  "--destructive",
  "--info",
  "--brand",
  "--muted-foreground",
] as const;

const FALLBACK_COLORS = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#db2777",
  "#7c3aed",
] as const;

const TOKENS_MAX = 5;

const toColorTokens = (declared: ReadonlySet<string>): string[] => {
  if (CHART_TOKENS.every((name) => declared.has(name))) {
    return [...CHART_TOKENS];
  }

  return NEAREST_TOKENS.filter((name) => declared.has(name)).slice(
    0,
    TOKENS_MAX
  );
};

const toColorExpressions = (tokens: readonly string[]): string[] =>
  FALLBACK_COLORS.map((fallback, index) => {
    const token = tokens[index] ?? null;

    if (token !== null) {
      return `var(${token})`;
    }

    return `var(--chart-${index + 1}, ${fallback})`;
  });

export { toColorExpressions, toColorTokens };
