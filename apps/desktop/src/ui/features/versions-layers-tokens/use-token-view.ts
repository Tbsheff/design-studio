import type { CompiledTokenEntry } from "@design-studio/contracts";
import { useCallback, useMemo } from "react";

import { rawToken, shownRaw, tokenSections } from "./token-draft.js";
import type { RawToken } from "./token-draft.js";
import { useSwatch } from "./use-swatch.js";
import type { TokenDraft } from "./use-token-draft.js";

interface TokenViewSource {
  readonly entries: CompiledTokenEntry[];
  readonly file: Parameters<typeof rawToken>[0];
}

interface TokenView {
  readonly baseOf: (entry: CompiledTokenEntry) => RawToken;
  readonly sections: ReturnType<typeof tokenSections>;
  readonly shownOf: (entry: CompiledTokenEntry) => RawToken;
  readonly swatchFor: ReturnType<typeof useSwatch>;
}

const useTokenView = (
  tokens: TokenViewSource,
  draft: TokenDraft,
  query: string
): TokenView => {
  const { file } = tokens;

  const bases = useMemo(
    () =>
      new Map(
        tokens.entries.map((entry) => [entry.path, rawToken(file, entry)])
      ),
    [tokens.entries, file]
  );

  const baseOf = useCallback(
    (entry: CompiledTokenEntry): RawToken =>
      bases.get(entry.path) ?? rawToken(file, entry),
    [bases, file]
  );

  const shownOf = useCallback(
    (entry: CompiledTokenEntry): RawToken =>
      shownRaw(baseOf(entry), draft.pending[entry.path] ?? null),
    [baseOf, draft.pending]
  );

  const sections = useMemo(
    () => tokenSections(tokens.entries, shownOf, query),
    [tokens.entries, shownOf, query]
  );

  const swatchFor = useSwatch(draft.effective?.entries ?? tokens.entries);

  return { baseOf, sections, shownOf, swatchFor };
};

export { useTokenView };

export type { TokenView, TokenViewSource };
