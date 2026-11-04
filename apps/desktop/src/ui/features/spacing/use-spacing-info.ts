import { useEffect, useState } from "react";

import { api } from "./deps.js";
import type { SelectionContext, SpacingBox, SpacingComputed } from "./deps.js";

interface SpacingIds {
  readonly directionId: string | null;
  readonly projectId: string;
}

interface InfoState {
  readonly box: SpacingBox | null;
  readonly key: string;
}

const EMPTY: InfoState = { box: null, key: "" };

const keyOf = (
  ids: SpacingIds,
  target: SelectionContext | null,
  round: number
): string => {
  const source = target?.source;

  if (!source || !ids.directionId) {
    return "";
  }

  return `${ids.projectId}/${ids.directionId}/${source.file}:${source.line}:${source.col}#${round}`;
};

const computedOf = (target: SelectionContext): SpacingComputed => ({
  gap: target.styles.gap ?? "",
  margin: target.styles.margin ?? "",
  padding: target.styles.padding ?? "",
});

const useSpacingInfo = (
  ids: SpacingIds,
  target: SelectionContext | null,
  round: number
): SpacingBox | null => {
  const [state, setState] = useState<InfoState>(EMPTY);
  const key = keyOf(ids, target, round);
  const { directionId, projectId } = ids;

  useEffect(() => {
    const source = target?.source;

    if (!key || !source || !target || !directionId) {
      return;
    }

    const live = { current: true };

    const load = async (): Promise<void> => {
      try {
        const box = await api.getSpacing(
          projectId,
          directionId,
          source,
          computedOf(target)
        );

        if (live.current) {
          setState({ box, key });
        }
      } catch {
        if (live.current) {
          setState({ box: null, key });
        }
      }
    };

    void load();

    return (): void => {
      live.current = false;
    };
  }, [directionId, projectId, key, target]);

  if (state.key !== key) {
    return null;
  }

  return state.box;
};

export { useSpacingInfo };
