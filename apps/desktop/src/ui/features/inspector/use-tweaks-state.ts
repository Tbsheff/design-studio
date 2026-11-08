import type { Project } from "@design-studio/contracts";
import { startTransition, useCallback, useEffect, useState } from "react";

import type { TweaksState } from "../../../shared/tweaks.js";
import { api, errorText } from "../../api.js";
import { useLatestRef } from "./use-latest-ref.js";

interface ChangeStamp {
  readonly directionId: string;
  readonly receivedAt: number;
}

interface TweaksStateOptions {
  readonly projectId: string;
  readonly project: Project | null;
  readonly directionId: string | null;
  readonly lastChange: ChangeStamp | null;
}

interface UseTweaksStateResult {
  readonly loadError: string | null;
  readonly replace: (state: TweaksState) => void;
  readonly state: TweaksState | null;
}

interface LoadedTweaks {
  readonly key: string;
  readonly revision: string;
  readonly state: TweaksState;
}

const toChangeStamp = (
  change: ChangeStamp | null,
  directionId: string | null
): number => {
  if (change && change.directionId === directionId) {
    return change.receivedAt;
  }

  return 0;
};

const toVisibleState = (
  loaded: LoadedTweaks | null,
  key: string
): TweaksState | null => {
  if (loaded?.key === key) {
    return loaded.state;
  }

  return null;
};

const useTweaksState = (options: TweaksStateOptions): UseTweaksStateResult => {
  const { directionId, lastChange, project, projectId } = options;
  const [loaded, setLoaded] = useState<LoadedTweaks | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const headVersionId =
    project?.directions.find((direction) => direction.id === directionId)
      ?.headVersionId ?? null;

  const stamp = toChangeStamp(lastChange, directionId);
  const key = `${projectId}:${directionId}`;
  const live = useLatestRef(key);

  useEffect(() => {
    if (!directionId) {
      return;
    }

    const want = `${projectId}:${directionId}`;
    const revision = `${headVersionId}:${stamp}`;

    startTransition(async () => {
      try {
        const state = await api.getTweaks(projectId, directionId);

        if (live.current !== want) {
          return;
        }

        setLoaded({ key: want, revision, state });
        setLoadError(null);
      } catch (error: unknown) {
        if (live.current === want) {
          setLoadError(errorText(error));
        }
      }
    });
  }, [projectId, directionId, headVersionId, stamp, live]);

  const replace = useCallback(
    (state: TweaksState) =>
      setLoaded({ key: live.current, revision: "", state }),
    [live]
  );

  return { loadError, replace, state: toVisibleState(loaded, key) };
};

export { useTweaksState };
