import type { CompiledTokenEntry, TokenFile } from "@design-studio/contracts";
import { useCallback, useRef } from "react";
import type { RefObject } from "react";

import { rawToken, withField, withPending } from "./token-draft.js";
import type { PendingMap, PendingToken, TokenField } from "./token-draft.js";

interface EditStep {
  readonly before: PendingToken | null;
  readonly field: TokenField;
  readonly path: string;
}

interface TokenFileRef {
  readonly tokens: { readonly file: TokenFile | null } | null;
}

interface TokenEditsInput {
  readonly apply: (next: PendingMap) => void;
  readonly scopeRef: RefObject<TokenFileRef>;
  readonly pendingRef: RefObject<PendingMap>;
}

interface TokenEdits {
  readonly clearHistory: () => void;
  readonly edit: (
    entry: CompiledTokenEntry,
    field: TokenField,
    value: string | null
  ) => void;
  readonly revert: (path: string) => void;
  readonly undoLast: () => void;
}

const useTokenEdits = (input: TokenEditsInput): TokenEdits => {
  const { apply, scopeRef, pendingRef } = input;
  const historyRef = useRef<EditStep[]>([]);

  const edit = useCallback(
    (
      entry: CompiledTokenEntry,
      field: TokenField,
      value: string | null
    ): void => {
      const map = pendingRef.current;
      const last = historyRef.current.at(-1);
      const before = map[entry.path] ?? null;

      if (!last || last.path !== entry.path || last.field !== field) {
        historyRef.current.push({ before, field, path: entry.path });
      }

      const base = rawToken(scopeRef.current.tokens?.file ?? null, entry);
      apply(
        withPending(map, entry.path, withField(before, field, value, base))
      );
    },
    [apply, scopeRef, pendingRef]
  );

  const revert = useCallback(
    (path: string): void => {
      historyRef.current = historyRef.current.filter(
        (step) => step.path !== path
      );
      apply(withPending(pendingRef.current, path, null));
    },
    [apply, pendingRef]
  );

  const undoLast = useCallback((): void => {
    const step = historyRef.current.pop();

    if (step) {
      apply(withPending(pendingRef.current, step.path, step.before));
    }
  }, [apply, pendingRef]);

  const clearHistory = useCallback((): void => {
    historyRef.current = [];
  }, []);

  return { clearHistory, edit, revert, undoLast };
};

export { useTokenEdits };

export type { TokenEdits, TokenFileRef };
