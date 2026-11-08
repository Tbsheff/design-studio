import { useCallback, useEffect, useRef, useState } from "react";

import { formatCopyCss } from "./authored-css.js";
import type { CopyState } from "./other-styles-model.js";
import type { AuthoredCssState } from "./use-authored-css.js";

const COPIED_MS = 1500;

interface CopyCss {
  readonly state: CopyState;
  readonly copyCss: () => Promise<void>;
}

const useCopyCss = (authored: AuthoredCssState): CopyCss => {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => (): void => {
      if (timer.current !== null) {
        globalThis.clearTimeout(timer.current);
      }
    },
    []
  );

  const copyCss = useCallback(async (): Promise<void> => {
    const css = await authored.request();
    let next: CopyState = "failed";

    if (css) {
      try {
        await navigator.clipboard.writeText(formatCopyCss(css));
        next = "copied";
      } catch {
        next = "failed";
      }
    }

    setState(next);

    if (timer.current !== null) {
      globalThis.clearTimeout(timer.current);
    }

    timer.current = globalThis.setTimeout(() => setState("idle"), COPIED_MS);
  }, [authored]);

  return { copyCss, state };
};

export { useCopyCss };
