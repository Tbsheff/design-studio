import { useCallback, useEffect, useMemo, useTransition } from "react";

import { copy } from "./copy.js";
import { spellingRoutes, textRoutes, useAction } from "./deps.js";
import { toWordsWith } from "./spelling-model.js";
import type { SpellingHitView } from "./spelling-model.js";

interface SpellingSetup {
  readonly changeStamp: number;
  readonly directionId: string | null;
  readonly frameId: string;
  readonly isLive: boolean;
  readonly projectId: string;
}

interface Spelling {
  readonly error: string | null;
  readonly handleAdd: (word: string) => void;
  readonly handleFix: (word: string, suggestion: string) => void;
  readonly isBusy: boolean;
  readonly isLoading: boolean;
  readonly items: readonly SpellingHitView[];
}

const LIST_LIMIT = 200;

const NO_ITEMS: readonly SpellingHitView[] = [];

const NO_WORDS: readonly string[] = [];

const useRefetchOnChange = (
  changeStamp: number,
  refetch: () => Promise<void>
): void => {
  useEffect(() => {
    if (changeStamp > 0) {
      void refetch();
    }
  }, [changeStamp, refetch]);
};

const useSpelling = (setup: SpellingSetup): Spelling => {
  const { changeStamp, directionId, frameId, isLive, projectId } = setup;
  const [isWorking, startWork] = useTransition();

  const input = useMemo(() => {
    if (directionId === null || !isLive) {
      return null;
    }

    const cursor = null;
    const limit = LIST_LIMIT;

    return { cursor, directionId, frameId, limit, projectId };
  }, [directionId, frameId, isLive, projectId]);

  const read = useAction(spellingRoutes.inspectSpelling, input);
  const fixer = useAction(textRoutes.updateText);
  const lister = useAction(spellingRoutes.setSpelling);
  const { refetch } = read;
  const { run: runFix } = fixer;
  const { run: runList } = lister;
  const items = read.data?.items ?? NO_ITEMS;

  useRefetchOnChange(changeStamp, refetch);
  const words = read.data?.wordList.words ?? NO_WORDS;

  const handleFix = useCallback(
    (word: string, suggestion: string): void => {
      if (directionId === null) {
        return;
      }

      const caseSensitive = true;
      const glob = null;
      const ids = null;
      const query = word;
      const regex = false;
      const replace = suggestion;
      const wholeWord = true;

      startWork(async () => {
        await runFix({
          caseSensitive,
          directionId,
          glob,
          ids,
          projectId,
          query,
          regex,
          replace,
          wholeWord,
        });
        await refetch();
      });
    },
    [directionId, projectId, refetch, runFix]
  );

  const handleAdd = useCallback(
    (word: string): void => {
      startWork(async () => {
        await runList({ projectId, words: toWordsWith(words, word) });
        await refetch();
      });
    },
    [projectId, refetch, runList, words]
  );

  let error: string | null = null;
  const failure = fixer.error ?? lister.error ?? read.error;

  if (failure !== null) {
    error = failure.message || copy.spellingFailed;
  }

  const isBusy = isWorking || fixer.pending || lister.pending;
  const isLoading = read.loading;

  return { error, handleAdd, handleFix, isBusy, isLoading, items };
};

export { useSpelling };

export type { Spelling, SpellingSetup };
