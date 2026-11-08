import { useCallback, useMemo } from "react";
import type { RefObject } from "react";

interface PortTarget {
  readonly directionId: string | null;
  readonly frameId: string | null;
}

interface PortEntry {
  readonly icon: "react";
  readonly id: string;
  readonly label: string;
  readonly run: () => void;
}

const usePortEntry = (
  root: RefObject<HTMLElement | null>,
  open: (target: PortTarget) => void
): PortEntry => {
  const run = useCallback((): void => {
    const frame = root.current?.closest<HTMLElement>("[data-frame-id]") ?? null;

    open({
      directionId: frame?.dataset.directionId ?? null,
      frameId: frame?.dataset.frameId ?? null,
    });
  }, [root, open]);

  return useMemo(
    () => ({ icon: "react", id: "port-to-app", label: "Move to app…", run }),
    [run]
  );
};

export { usePortEntry };
