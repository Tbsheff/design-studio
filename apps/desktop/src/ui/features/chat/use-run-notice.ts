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
  "Notification" in globalThis &&
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

    const isFresh =
      finishedAt !== null && finishedAt >= since && !shown.has(run.runId);

    if (isFresh && text) {
      shown.add(run.runId);
      out.push(text);
    }
  }

  return out;
};

const useRunNotice = (projectName: string | null, runs: RunMap): void => {
  const hiddenAt = useRef<number | null>(null);
  const shown = useRef(new Set<string>());
  useEffect(() => {
    const onVisibility = (): void => {
      hiddenAt.current = null;

      if (document.hidden) {
        hiddenAt.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return (): void =>
      document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  useEffect(() => {
    if (hiddenAt.current === null || !canNotify()) {
      return;
    }

    const finished = newlyFinished(runs, hiddenAt.current, shown.current);

    if (finished.length === 0) {
      return;
    }

    let body = `${finished.length} runs ended`;

    if (finished.length === 1) {
      body = finished[0] ?? "";
    }

    const notice = new Notification(projectName || "Run finished", { body });
    const focusWindow = (): void => window.focus();
    notice.addEventListener("click", focusWindow);

    return (): void => notice.removeEventListener("click", focusWindow);
  }, [projectName, runs]);
};

export { useRunNotice };
