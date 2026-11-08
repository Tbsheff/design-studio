import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useEffect, useRef } from "react";
import type { MutableRefObject } from "react";

import type { Options } from "./component-insert-model.js";

const RESELECT_FOR_MS = 6000;

interface ReselectJob {
  readonly name: string;
  readonly selector: string;
  readonly target: string;
  readonly until: number;
}

interface Reselect {
  readonly startReselect: (
    selector: string,
    name: string,
    target: string
  ) => void;
  readonly tickReselect: () => void;
}

const isLanded = (
  last: SelectionContext | undefined,
  job: ReselectJob
): boolean => {
  if (!last) {
    return false;
  }

  return last.selector !== job.target && last.owners?.[0]?.name === job.name;
};

const useReselect = (live: MutableRefObject<Options>): Reselect => {
  const reselect = useRef<ReselectJob | null>(null);

  const tickReselect = useCallback((): void => {
    const job = reselect.current;

    if (!job) {
      return;
    }

    const last = live.current.selection.at(-1);

    if (isLanded(last, job) || Date.now() > job.until) {
      reselect.current = null;

      return;
    }

    live.current.frames.post({
      selector: job.selector,
      type: "select-selector",
    });
  }, [live]);

  const startReselect = useCallback(
    (selector: string, name: string, target: string): void => {
      reselect.current = {
        name,
        selector,
        target,
        until: Date.now() + RESELECT_FOR_MS,
      };
      tickReselect();
    },
    [tickReselect]
  );

  useEffect(
    () => (): void => {
      reselect.current = null;
    },
    []
  );

  return { startReselect, tickReselect };
};

export { useReselect };

export type { Reselect };
