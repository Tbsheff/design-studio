import { useEffect, useRef } from "react";

const useStickOnNewRun = (
  runId: string | null,
  stickToBottom: () => void
): void => {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;

      return;
    }

    if (runId) {
      stickToBottom();
    }
  }, [runId, stickToBottom]);
};

export { useStickOnNewRun };
