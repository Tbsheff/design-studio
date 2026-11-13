import type { CompiledTokenEntry } from "@design-studio/contracts";

const tokenEntries = (
  tokens: { entries: CompiledTokenEntry[] } | null
): CompiledTokenEntry[] => tokens?.entries ?? [];

export { tokenEntries };
