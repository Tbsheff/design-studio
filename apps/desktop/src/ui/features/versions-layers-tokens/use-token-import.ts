import { routes } from "@design-studio/actions/token/routes";
import { useCallback, useState, useTransition } from "react";

import { useAction } from "../../platform/query.js";
import type { ActionState } from "../../platform/query.js";
import { COPY } from "./copy.js";

type TokenImportView = NonNullable<
  ActionState<typeof routes.importToken>["data"]
>;

interface TokenImportSetup {
  readonly directionId: string | null;
  readonly projectId: string;
}

interface TokenImportState {
  readonly handleRefresh: () => void;
  readonly isBusy: boolean;
  readonly note: string | null;
}

const MAIN_DIRECTION_ID = "main";

const toRefreshNote = (view: TokenImportView): string => {
  if (view.versionId === null) {
    return COPY.refreshSame;
  }

  return `${view.changed}${COPY.refreshChanged}${view.added}${COPY.refreshAdded}${view.removed}${COPY.refreshRemoved}`;
};

const toNoteText = (
  error: Error | null,
  result: TokenImportView | null
): string | null => {
  if (error !== null) {
    return COPY.refreshFailed;
  }

  if (result === null) {
    return null;
  }

  return toRefreshNote(result);
};

const useTokenImport = (setup: TokenImportSetup): TokenImportState => {
  const importer = useAction(routes.importToken);
  const [result, setResult] = useState<TokenImportView | null>(null);
  const [isBusy, startWork] = useTransition();
  const { run } = importer;
  const { directionId, projectId } = setup;

  const handleRefresh = useCallback((): void => {
    startWork(async () => {
      const done = await run({
        directionId: directionId ?? MAIN_DIRECTION_ID,
        projectId,
      });

      setResult(done);
    });
  }, [directionId, projectId, run]);

  return {
    handleRefresh,
    isBusy,
    note: toNoteText(importer.error, result),
  };
};

export { useTokenImport };

export type { TokenImportSetup, TokenImportState, TokenImportView };
