import { TOKENS_FILE } from "@design-studio/contracts";
import type {
  CompiledTokenEntry,
  DesignSystemState,
} from "@design-studio/contracts";

type TokenTheme = "dark" | "light";

type TokenSetChange =
  | { readonly darkValue: string; readonly path: string }
  | { readonly path: string; readonly value: string };

interface TokenSetReadback {
  readonly file: string;
  readonly line: number | null;
  readonly resolved: string | null;
  readonly value: string | null;
}

const toTokenEntry = (
  state: DesignSystemState,
  name: string
): CompiledTokenEntry | null =>
  state.entries.find((item) => item.cssVar === name || item.path === name) ??
  null;

const toMissingTokenText = (state: DesignSystemState, name: string): string => {
  if (state.entries.length === 0) {
    return "This direction has no tokens. Use get_tokens to check.";
  }

  return `No token ${name}. Use get_tokens for the names.`;
};

const toTokenSetChange = (
  entry: CompiledTokenEntry,
  theme: TokenTheme,
  value: string
): TokenSetChange => {
  if (theme === "dark") {
    return { darkValue: value, path: entry.path };
  }

  return { path: entry.path, value };
};

const toDarkReadback = (entry: CompiledTokenEntry): TokenSetReadback => {
  const { source } = entry;

  if (source) {
    return {
      file: source.file,
      line: source.darkLine,
      resolved: entry.darkValue,
      value: source.darkValue,
    };
  }

  return {
    file: TOKENS_FILE,
    line: null,
    resolved: entry.darkValue,
    value: entry.darkValue,
  };
};

const toTokenReadback = (
  entry: CompiledTokenEntry,
  theme: TokenTheme
): TokenSetReadback => {
  if (theme === "dark") {
    return toDarkReadback(entry);
  }

  const { source } = entry;

  return {
    file: source?.file ?? TOKENS_FILE,
    line: source?.line ?? null,
    resolved: entry.value,
    value: source?.value ?? entry.value,
  };
};

export { toMissingTokenText, toTokenEntry, toTokenReadback, toTokenSetChange };

export type { TokenSetReadback, TokenTheme };
