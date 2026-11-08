import { useEffect } from "react";
import type { RefObject } from "react";

import { isTypingTarget } from "./deps.js";

const isModified = (event: KeyboardEvent): boolean =>
  event.metaKey || event.ctrlKey || event.altKey;

const useCommentKeys = (
  availableRef: RefObject<boolean>,
  toggle: () => void,
  setOn: (on: boolean) => void
): void => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (isTypingTarget(event.target) || isModified(event)) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "c" && availableRef.current) {
        event.preventDefault();
        toggle();
      }

      if (key === "v" || key === "escape") {
        setOn(false);
      }
    };

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, [availableRef, setOn, toggle]);
};

export { useCommentKeys };
