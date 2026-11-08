import { useCallback, useEffect, useState } from "react";

import type { LayerFrames } from "./layer-edits-types.js";
import { useLatestRef } from "./use-latest-ref.js";

interface TreeState {
  readonly isFresh: boolean;
  readonly isTreeFresh: () => boolean;
  readonly setTreeToken: (token: string) => void;
}

const useTreeState = (
  frames: LayerFrames,
  isTreeWanted: boolean
): TreeState => {
  const { frontToken, post } = frames;
  const [treeToken, setTreeToken] = useState<string | null>(null);
  const isFresh = treeToken !== null && treeToken === frontToken;
  const freshRef = useLatestRef(isFresh);

  useEffect(() => {
    if (isTreeWanted && frontToken) {
      post({ type: "request-tree" });
    }
  }, [isTreeWanted, frontToken, post]);

  const isTreeFresh = useCallback((): boolean => freshRef.current, [freshRef]);

  return { isFresh, isTreeFresh, setTreeToken };
};

export { useTreeState };

export type { TreeState };
