import type { RunView } from "./run-state-model.js";

const RUN_ANNOUNCE: Record<RunView["status"], string> = {
  budget_exceeded: "Run stopped at the spending limit",
  canceled: "Run stopped",
  completed: "Run finished",
  failed: "Run failed",
  running: "Run started",
};

const toAnnouncement = (run: RunView | undefined): string => {
  if (!run) {
    return "";
  }

  if (run.status !== "running") {
    return RUN_ANNOUNCE[run.status];
  }

  const [asking] = run.permissions;

  if (asking) {
    return `The agent needs your answer: ${asking.title}`;
  }

  if (run.queue.length > 0) {
    return `${RUN_ANNOUNCE.running}. ${run.queue.length} queued`;
  }

  return RUN_ANNOUNCE.running;
};

export { toAnnouncement };
