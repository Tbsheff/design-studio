import type { RunSummary } from "@design-studio/contracts";
import { useCallback } from "react";
import type { Dispatch, KeyboardEvent, SetStateAction } from "react";

interface SearchKeyOptions {
  readonly active: number;
  readonly runs: readonly RunSummary[];
  readonly setActive: Dispatch<SetStateAction<number>>;
  readonly onClose: () => void;
  readonly onPick: (runId: string) => void;
}

const useSearchKeys = (
  options: SearchKeyOptions
): ((event: KeyboardEvent<HTMLInputElement>) => void) => {
  const { active, runs, setActive, onClose, onPick } = options;

  return useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();

        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (runs.length === 0) {
          return;
        }

        event.preventDefault();
        let step: 1 | -1 = -1;

        if (event.key === "ArrowDown") {
          step = 1;
        }

        setActive((index) => (index + step + runs.length) % runs.length);

        return;
      }

      const picked = runs[active];

      if (event.key === "Enter" && !event.nativeEvent.isComposing && picked) {
        event.preventDefault();
        onPick(picked.id);
      }
    },
    [active, runs, setActive, onClose, onPick]
  );
};

export { useSearchKeys };
