import { useEffect, useRef, useState, useTransition } from "react";

import { suggestionRoutes, useAction } from "./deps.js";
import type { Suggestion, SuggestionRunIds } from "./suggestion-model.js";

interface SuggestionList {
  readonly isPending: boolean;
  readonly suggestions: readonly Suggestion[];
}

const useSuggestions = (ids: SuggestionRunIds): SuggestionList => {
  const action = useAction(suggestionRoutes.runSuggestion);
  const { run } = action;
  const [list, setList] = useState<readonly Suggestion[]>([]);
  const [isPending, startWork] = useTransition();
  const startedRun = useRef<string | null>(null);
  const { directionId, projectId, runId } = ids;

  useEffect(() => {
    if (startedRun.current === runId) {
      return;
    }

    startedRun.current = runId;

    startWork(async () => {
      const done = await run({ directionId, projectId, runId });

      if (done !== null) {
        setList(done.suggestions);
      }
    });
  }, [directionId, projectId, run, runId]);

  return { isPending, suggestions: list };
};

export { useSuggestions };

export type { SuggestionList };
