import { useEffect, useRef } from "react";

import { useSetDevStatus } from "./use-set.js";

const note = null;

const status = "ready";

const useMarkOnOpen = (projectId: string, frameId: string | null): void => {
  const { run } = useSetDevStatus();
  const hasMarked = useRef(false);
  const runRef = useRef(run);

  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    if (frameId === null || hasMarked.current) {
      return;
    }

    hasMarked.current = true;
    runRef.current({ frameId, note, projectId, status });
  }, [frameId, projectId]);
};

export { useMarkOnOpen };
