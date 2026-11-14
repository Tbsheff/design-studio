import { useCallback } from "react";
import type { KeyboardEvent } from "react";

import { prefetchStudio } from "../../app/screen-preload.js";
import { isExampleTakeKey } from "./home-model.js";

type ExampleTake = (event: KeyboardEvent<HTMLTextAreaElement>) => boolean;

const useExampleTake = (
  example: string | null,
  value: string,
  onChange: (value: string) => void
): ExampleTake =>
  useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (example === null || value !== "" || !isExampleTakeKey(event)) {
        return false;
      }

      event.preventDefault();
      void prefetchStudio();
      onChange(example);

      return true;
    },
    [example, value, onChange]
  );

export { useExampleTake };

export type { ExampleTake };
