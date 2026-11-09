import type { Version } from "@design-studio/contracts";
import { useCallback } from "react";

import { useUndoShortcut } from "../canvas/use-undo-shortcut.js";
import type { RedoShortcut } from "../canvas/use-undo-shortcut.js";
import { useTokenFrameSync as useTokenFrames } from "../design-system/token-frames.js";
import type { DesignTokens } from "../design-system/use-design-system-state.js";
import { useTokenDraft } from "./use-token-draft.js";

interface Options {
  projectId: string;
  directionId: string | null;
  tokens: DesignTokens | null;
  canUndo: boolean;
  onUndo: () => void;
  redo?: RedoShortcut;
  onCommitted: (version: Version) => void;
  onSelectSite: (selector: string) => void;
}

type TokenDraft = ReturnType<typeof useTokenDraft>;

interface StudioTokensPanel {
  readonly draft: TokenDraft;
  readonly onSelectSite: (selector: string) => void;
  readonly sweep: {
    readonly directionId: string | null;
    readonly projectId: string;
  };
  readonly tokens: DesignTokens;
}

interface StudioTokens {
  readonly draft: TokenDraft;
  readonly guard: <Args extends unknown[], Result>(
    fn: (...args: Args) => Result
  ) => (...args: Args) => Promise<void>;
  readonly panel: StudioTokensPanel | null;
}

const useStudioTokens = (options: Options): StudioTokens => {
  const draft = useTokenDraft(options);
  const {
    canUndo,
    directionId,
    onSelectSite,
    onUndo,
    projectId,
    redo,
    tokens,
  } = options;
  const { confirmLeave, count, undoLast } = draft;
  useTokenFrames();

  const handleUndo = useCallback((): void => {
    if (count > 0) {
      undoLast();
    } else {
      onUndo();
    }
  }, [count, onUndo, undoLast]);

  useUndoShortcut(canUndo || count > 0, handleUndo, redo);

  const guard = useCallback(
    <Args extends unknown[], Result>(fn: (...args: Args) => Result) =>
      async (...args: Args): Promise<void> => {
        if (confirmLeave()) {
          await fn(...args);
        }
      },
    [confirmLeave]
  );

  let panel: StudioTokensPanel | null = null;

  if (tokens) {
    const sweep = { directionId, projectId };

    panel = { draft, onSelectSite, sweep, tokens };
  }

  return { draft, guard, panel };
};

export { useStudioTokens };
