import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { PlayCommentMode } from "./play-comment-model.js";
import { isTypingTarget } from "../../platform/typing-target.js";

const isModified = (event: KeyboardEvent): boolean =>
  event.metaKey || event.ctrlKey || event.altKey;

const usePlayCommentMode = (isAvailable: boolean): PlayCommentMode => {
  const [isOn, setIsOn] = useState(false);
  const live = useRef({ isAvailable, isOn });
  const isShown = isOn && isAvailable;

  useLayoutEffect(() => {
    live.current = { isAvailable, isOn: isShown };
  });

  const setOff = useCallback((): void => setIsOn(false), []);
  const toggle = useCallback((): void => setIsOn((prev) => !prev), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (isModified(event) || event.repeat) {
        return;
      }

      const { isAvailable: canComment, isOn: isActive } = live.current;

      if (event.key === "Escape" && isActive) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setIsOn(false);

        return;
      }

      if (event.key.toLowerCase() !== "c" || !canComment) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      setIsOn((prev) => !prev);
    };

    globalThis.addEventListener("keydown", onKey, true);

    return (): void => globalThis.removeEventListener("keydown", onKey, true);
  }, []);

  return { isOn: isShown, setOff, toggle };
};

export { usePlayCommentMode };
