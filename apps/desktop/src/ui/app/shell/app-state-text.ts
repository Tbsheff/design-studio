import type { AppServerStatus } from "@design-studio/actions/_core/contracts";

const STATE_TEXT: Record<AppServerStatus["state"], string> = {
  failed: "Failed",
  idle: "Not started",
  ready: "Running",
  starting: "Starting",
  stopped: "Stopped",
};

function stateText(status: AppServerStatus | null, managed: boolean): string {
  const state = status?.state ?? "idle";

  if (managed) {
    return STATE_TEXT[state];
  }

  return state === "ready"
    ? "Answers"
    : state === "failed"
      ? "No answer"
      : state === "starting"
        ? "Checking"
        : "Not checked";
}

function statusLine(status: AppServerStatus | null, managed: boolean): string {
  const parts = [stateText(status, managed)];

  if (status?.upstream) {
    parts.push(status.upstream);
  }

  parts.push(managed ? "started by the studio" : "your dev server");

  return parts.join(" · ");
}

export { STATE_TEXT, stateText, statusLine };
