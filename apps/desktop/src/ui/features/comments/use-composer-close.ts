import { useCallback, useEffect, useRef, useState } from "react";

import { CLOSE_MS, hasReducedMotion } from "./comment-composer-model.js";

interface ComposerClose {
  closeWith: (finish: () => void) => void;
  isClosing: boolean;
}

const useComposerClose = (): ComposerClose => {
  const [isClosing, setIsClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => (): void => {
      if (timer.current !== null) {
        globalThis.clearTimeout(timer.current);
      }
    },
    []
  );

  const closeWith = useCallback((finish: () => void): void => {
    if (hasReducedMotion()) {
      finish();

      return;
    }

    setIsClosing(true);
    timer.current = globalThis.setTimeout(finish, CLOSE_MS);
  }, []);

  return { closeWith, isClosing };
};

export { useComposerClose };
