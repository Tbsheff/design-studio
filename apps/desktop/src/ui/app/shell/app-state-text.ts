import type { AppServerStatus } from "@design-studio/contracts";

import { pick } from "../../platform/pick.js";

const STATE_TEXT: Record<AppServerStatus["state"], string> = {
  failed: "Failed",
  idle: "Not started",
  ready: "Running",
  starting: "Starting",
  stopped: "Stopped",
};

const stateText = (
  status: AppServerStatus | null,
  managed: boolean
): string => {
  const state = status?.state ?? "idle";

  if (managed) {
    return STATE_TEXT[state];
  }

  if (state === "ready") {
    return "Answers";
  }

  if (state === "failed") {
    return "No answer";
  }

  if (state === "starting") {
    return "Checking";
  }

  return "Not checked";
};

const statusLine = (
  status: AppServerStatus | null,
  managed: boolean
): string => {
  const parts = [stateText(status, managed)];

  if (status?.upstream) {
    parts.push(status.upstream);
  }

  parts.push(pick(managed, "started by the studio", "your dev server"));

  return parts.join(" · ");
};

export { STATE_TEXT, stateText, statusLine };
