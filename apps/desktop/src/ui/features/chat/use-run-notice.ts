import type { RunStatus } from "@design-studio/contracts";
import { useEffect, useRef } from "react";

import { isDesktop } from "../../platform/desktop.js";
import type { RunMap } from "./run-state-model.js";

const STATUS_TEXT: Partial<Record<RunStatus, string>> = {
  budget_exceeded: "Run stopped at the budget limit",
  completed: "Run finished",
  failed: "Run failed",
};

const canNotify = (): boolean =>
  document.hidden &&
  !isDesktop() &&
  typeof Notification !== "undefined" &&
  Notification.permission === "granted";

const newlyFinished = (
  runs: RunMap,
  since: number,
  shown: Set<string>
): string[] => {
  const out: string[] = [];

  for (const run of Object.values(runs)) {
    const finishedAt = run.summary?.finishedAt ?? null;
    const text = STATUS_TEXT[run.status];

    if (
      finishedAt === null ||
      finishedAt < since ||
      !text ||
      shown.has(run.runId)
    ) {
      continue;
    }

    shown.add(run.runId);
    out.push(text);
  }

  return out;
};

export const useRunNotice = (
  projectName: string | null,
  runs: RunMap
): void => {
  const hiddenAt = useRef<number | null>(null);
  const shown = useRef(new Set<string>());
  useEffect(() => {
    const onVisibility = () => {
      hiddenAt.current = document.hidden ? Date.now() : null;
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  useEffect(() => {
    if (hiddenAt.current === null || !canNotify()) {
      return;
    }

    const finished = newlyFinished(runs, hiddenAt.current, shown.current);

    if (finished.length === 0) {
      return;
    }

    const body =
      finished.length === 1
        ? (finished[0] ?? "")
        : `${finished.length} runs ended`;

    const notice = new Notification(projectName || "Run finished", { body });
    notice.onclick = () => window.focus();
  }, [projectName, runs]);
};
