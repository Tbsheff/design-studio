import { useEffect, useState } from "react";

import { api, errorText } from "../../api.js";

interface HiddenProjects {
  readonly count: number;
  readonly target: string;
}

interface HiddenProjectsState {
  readonly error: string | null;
  readonly hidden: HiddenProjects | null;
  readonly isMoving: boolean;
  readonly move: () => Promise<void>;
}

const toFailureText = (
  failed: readonly { readonly error: string }[]
): string | null => {
  const [first] = failed;

  if (!first) {
    return null;
  }

  let plural = "s";

  if (failed.length === 1) {
    plural = "";
  }

  return `Could not move ${failed.length} project${plural}: ${first.error}`;
};

const runMove = async (): Promise<{
  readonly hasMoved: boolean;
  readonly error: string | null;
}> => {
  try {
    const result = await api.moveHiddenProjects();

    return {
      error: toFailureText(result.failed),
      hasMoved: result.moved.length > 0,
    };
  } catch (error) {
    return { error: errorText(error), hasMoved: false };
  }
};

const getHidden = async (): Promise<HiddenProjects | null> => {
  try {
    return await api.hiddenProjects();
  } catch {
    return null;
  }
};

const useHiddenProjects = (onMoved: () => void): HiddenProjectsState => {
  const [hidden, setHidden] = useState<HiddenProjects | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;

    const load = async (): Promise<void> => {
      const next = await getHidden();

      if (live) {
        setHidden(next);
      }
    };

    load();

    return (): void => {
      live = false;
    };
  }, []);

  const move = async (): Promise<void> => {
    setIsMoving(true);
    setError(null);
    const outcome = await runMove();
    setError(outcome.error);

    if (outcome.hasMoved) {
      onMoved();
    }

    setIsMoving(false);
    setHidden(await getHidden());
  };

  return { error, hidden, isMoving, move };
};

export { useHiddenProjects };

export type { HiddenProjects, HiddenProjectsState };
