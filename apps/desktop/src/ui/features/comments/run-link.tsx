import type { ReactElement } from "react";
import { useCallback } from "react";

const toRunLabel = (status: string): string => {
  if (status === "sent") {
    return "Running…";
  }

  return "Open run";
};

const RunLink = ({
  onOpenRun,
  runId,
  status,
}: {
  onOpenRun: (runId: string) => void;
  runId: string;
  status: string;
}): ReactElement => {
  const open = useCallback((): void => {
    onOpenRun(runId);
  }, [onOpenRun, runId]);

  return (
    <button type="button" onClick={open}>
      {toRunLabel(status)}
    </button>
  );
};

export { RunLink };
