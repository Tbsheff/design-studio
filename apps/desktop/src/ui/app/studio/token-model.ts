import type { CompiledTokenEntry } from "@design-studio/actions/_core/contracts";

const hasDarkValue = (entry: CompiledTokenEntry): boolean =>
  (entry.darkValue ?? null) !== null;

const hasDarkMode = (
  tokens: { mode: string; entries: CompiledTokenEntry[] } | null
): boolean => tokens?.mode === "light" && tokens.entries.some(hasDarkValue);

const tokenEntries = (
  tokens: { entries: CompiledTokenEntry[] } | null
): CompiledTokenEntry[] => tokens?.entries ?? [];

export { hasDarkMode, tokenEntries };
