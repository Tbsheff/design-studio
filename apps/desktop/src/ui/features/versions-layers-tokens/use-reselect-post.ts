import { useCallback } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";

import { COPY } from "./copy.js";
import { isReselectWaiting, toReselectMessage } from "./layer-edits-model.js";
import type { LayerEditsOptions, Reselect } from "./layer-edits-types.js";

interface ReselectPostInput {
  readonly activeRef: RefObject<Reselect | null>;
  readonly liveRef: RefObject<LayerEditsOptions>;
  readonly notify: (message: string) => void;
  readonly setPending: Dispatch<SetStateAction<Reselect | null>>;
}

interface ReselectPost {
  readonly expire: (target: Reselect) => void;
  readonly postReselect: (target: Reselect) => void;
}

const useReselectPost = (input: ReselectPostInput): ReselectPost => {
  const { activeRef, liveRef, notify, setPending } = input;

  const expire = useCallback(
    (target: Reselect): void => {
      if (activeRef.current !== target) {
        return;
      }

      setPending(null);

      if (target.move) {
        liveRef.current.setSelection(() => []);
        notify(COPY.noticeSelectAgain);
      }
    },
    [activeRef, liveRef, notify, setPending]
  );

  const postReselect = useCallback(
    (target: Reselect): void => {
      const { frames } = liveRef.current;

      if (Date.now() > target.until) {
        expire(target);

        return;
      }

      if (!isReselectWaiting(target, frames.frontToken)) {
        frames.post(toReselectMessage(target));
      }
    },
    [expire, liveRef]
  );

  return { expire, postReselect };
};

export { useReselectPost };
