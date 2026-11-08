import type { CompiledTokenEntry } from "@design-studio/contracts";

import type { PendingToken, RawToken, TokenField } from "./token-draft.js";

interface TokenRowProps {
  readonly base: RawToken;
  readonly entry: CompiledTokenEntry;
  readonly error: string | undefined;
  readonly onEdit: (
    entry: CompiledTokenEntry,
    field: TokenField,
    value: string | null
  ) => void;
  readonly onRevert: (path: string) => void;
  readonly pending: PendingToken | undefined;
  readonly showDark: boolean;
  readonly shown: RawToken;
  readonly swatchFor: (value: string, dark: boolean) => string;
}

export type { TokenRowProps };
