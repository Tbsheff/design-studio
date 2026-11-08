import type { RunStatus, SelectionContext } from "@design-studio/contracts";
import type { PointerEvent as ReactPointerEvent } from "react";

const MAX_ERROR_LENGTH = 60;

const STATUS_TEXT: Record<RunStatus, string> = {
  budget_exceeded: "Budget limit",
  canceled: "Canceled",
  completed: "Done",
  failed: "Failed",
  running: "Running",
};

interface Sibling {
  id: string;
  label: string;
  title: string;
}

interface FrameVariation {
  label: string;
  title: string;
  status: RunStatus | null;
  costText: string;
  siblings: Sibling[];
  scoped?: boolean;
  error?: string | null;
  keepBlocked?: string | null;
  onKeep: () => void | Promise<void>;
  onMix: (toDirectionId: string, element: SelectionContext) => Promise<void>;
}

const stop = (event: ReactPointerEvent): void => event.stopPropagation();

const shortRejection = (error: string): string => {
  if (!error.startsWith("Rejected:")) {
    if (error.length > MAX_ERROR_LENGTH) {
      return `${error.slice(0, MAX_ERROR_LENGTH)}…`;
    }

    return error;
  }

  if (/another file|other files/u.test(error)) {
    return "Rejected: changed another file";
  }

  return "Rejected: changed code outside the element";
};

export { shortRejection, STATUS_TEXT, stop };

export type { FrameVariation, Sibling };
