import type { Dispatch, SetStateAction } from "react";

import type { PenAnchor } from "./drawing-model.js";
import { toPenKeyAction } from "./vector-pen-model.js";
import type { PenKeyAction } from "./vector-pen-model.js";

const usePenKeys = (
  getAnchors: () => PenAnchor[],
  finish: (isClosed: boolean) => void,
  setAnchors: Dispatch<SetStateAction<PenAnchor[]>>
): ((key: string) => boolean) => {
  const runAction = (action: PenKeyAction): void => {
    if (action === "close") {
      finish(true);

      return;
    }

    if (action === "cancel") {
      finish(false);

      return;
    }

    setAnchors((prev) => prev.slice(0, -1));
  };

  return (key: string): boolean => {
    const action = toPenKeyAction(key, getAnchors().length);

    if (action === null) {
      return false;
    }

    runAction(action);

    return true;
  };
};

export { usePenKeys };
