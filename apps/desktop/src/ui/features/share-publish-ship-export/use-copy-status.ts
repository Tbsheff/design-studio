import { useCallback, useEffect, useRef, useState } from "react";

import { RESET_MS } from "./copy-code-model.js";
import type { CopyState } from "./copy-code-model.js";

interface CopyStatus {
  readonly setBusy: () => void;
  readonly settle: (next: CopyState) => void;
  readonly state: CopyState;
}

const IDLE: CopyState = { kind: "idle" };

const useCopyStatus = (): CopyStatus => {
  const [state, setState] = useState<CopyState>(IDLE);
  const timer = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  useEffect(
    () => (): void => {
      if (timer.current !== null) {
        globalThis.clearTimeout(timer.current);
      }
    },
    []
  );

  const setBusy = useCallback((): void => {
    setState({ kind: "busy" });
  }, []);

  const settle = useCallback((next: CopyState): void => {
    setState(next);

    if (timer.current !== null) {
      globalThis.clearTimeout(timer.current);
    }

    timer.current = globalThis.setTimeout(() => {
      setState(IDLE);
    }, RESET_MS);
  }, []);

  return { setBusy, settle, state };
};

export { useCopyStatus };

export type { CopyStatus };
