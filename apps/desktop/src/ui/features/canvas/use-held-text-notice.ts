import type { BridgeToParent } from "@design-studio/contracts";
import { useEffect } from "react";

import { copy } from "./copy.js";

type FrameListen = (handler: (message: BridgeToParent) => void) => () => void;

const useHeldTextNotice = (
  listen: FrameListen,
  notify: (message: string) => void
): void => {
  useEffect(
    () =>
      listen((message) => {
        if (message.type === "text-commit" && message.isHeld) {
          notify(copy.textKept);
        }
      }),
    [listen, notify]
  );
};

export { useHeldTextNotice };
