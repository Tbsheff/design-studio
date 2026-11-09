import { useCallback, useState } from "react";
import type { KeyboardEvent } from "react";

import type { NearToken } from "./eyedropper-model.js";

interface EyedropperKeys {
  readonly activeIndex: number;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  readonly resetIndex: () => void;
  readonly setActiveIndex: (index: number) => void;
}

const useEyedropperKeys = (
  near: readonly NearToken[],
  onChoose: (cssVar: string) => void
): EyedropperKeys => {
  const [activeIndex, setActiveIndex] = useState(0);

  const resetIndex = useCallback((): void => setActiveIndex(0), []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, near.length - 1));
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const chosen = near[activeIndex];

        if (chosen) {
          onChoose(chosen.cssVar);
        }
      }
    },
    [near, activeIndex, onChoose]
  );

  return { activeIndex, handleKeyDown, resetIndex, setActiveIndex };
};

export { useEyedropperKeys };
