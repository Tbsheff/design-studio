import { useCallback, useState, useTransition } from "react";
import type { Dispatch, SetStateAction } from "react";

import { copy } from "./copy.js";
import { briefRoutes, call } from "./deps.js";

interface ExpandPrompt {
  readonly canUndo: boolean;
  readonly error: string | null;
  readonly expand: () => void;
  readonly isExpanding: boolean;
  readonly undo: () => void;
}

interface ExpandPromptDeps {
  readonly prompt: string;
  readonly setPrompt: Dispatch<SetStateAction<string>>;
}

const useExpandPrompt = ({
  prompt,
  setPrompt,
}: ExpandPromptDeps): ExpandPrompt => {
  const [original, setOriginal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanding, startExpand] = useTransition();

  const expand = useCallback((): void => {
    const source = prompt;

    const run = async (): Promise<void> => {
      setError(null);

      try {
        const result = await call(briefRoutes.runBrief, {
          projectId: null,
          prompt: source,
        });

        setOriginal(source);
        setPrompt(result.brief);
      } catch {
        setError(copy.expandPromptFailed);
      }
    };

    startExpand(run);
  }, [prompt, setPrompt]);

  const undo = useCallback((): void => {
    if (original === null) {
      return;
    }

    setPrompt(original);
    setOriginal(null);
    setError(null);
  }, [original, setPrompt]);

  return {
    canUndo: original !== null && prompt !== "",
    error,
    expand,
    isExpanding,
    undo,
  };
};

export { useExpandPrompt };

export type { ExpandPrompt };
