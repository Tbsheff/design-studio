import { Icon } from "@design-studio/ui";
import { useEffect, useRef } from "react";
import type { ReactElement, ReactNode } from "react";

import { useConversation } from "../../ai/components/ai/conversation.js";
import { EarlierRuns, useHistoryWindow } from "./chat-panel-window.js";
import type { TimelineItem } from "./mcp-feed.js";
import type { RunView } from "./run-state-model.js";

const StickOnNewRun = ({ runId }: { runId: string | null }): null => {
  const { stickToBottom } = useConversation();
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

  return null;
};

interface TimelineProps {
  items: TimelineItem[];
  resetKey: string | null;
  reveal: string | null;
  onRevealed: () => void;
  render: (item: TimelineItem) => ReactNode;
}

const WindowedTimeline = ({
  items,
  resetKey,
  reveal,
  onRevealed,
  render,
}: TimelineProps): ReactElement => {
  const { shown, hidden, more } = useHistoryWindow(items, resetKey, reveal);
  const inView = reveal !== null && shown.some((item) => item.key === reveal);

  return (
    <>
      <EarlierRuns hidden={hidden} onMore={more} />
      {shown.map(render)}
      <ScrollToRun runId={reveal} shown={inView} onDone={onRevealed} />
    </>
  );
};

const EmptyChat = (): ReactElement => (
  <div className="chat-empty">
    <span className="chat-empty-icon">
      <Icon name="sparkle" size={18} />
    </span>
    <strong>No runs yet</strong>
    <p>
      Describe a change below. To target one part, press V, then click an
      element in the preview.
    </p>
  </div>
);

const EmptyState = ({ empty }: { empty: boolean }): ReactElement | null =>
  empty ? <EmptyChat /> : null;

const FOUND_MS = 1600;

const ScrollToRun = ({
  runId,
  shown,
  onDone,
}: {
  runId: string | null;
  shown: boolean;
  onDone: () => void;
}): null => {
  const { viewportRef, wasAtBottomRef } = useConversation();
  useEffect(() => {
    if (!runId || !shown) {
      return;
    }

    const el = viewportRef.current?.querySelector<HTMLElement>(
      `[data-run-id="${CSS.escape(runId)}"]`
    );

    if (!el) {
      return;
    }

    wasAtBottomRef.current = false;
    el.scrollIntoView({ block: "start" });
    el.dataset.found = "";
    globalThis.setTimeout(() => delete el.dataset.found, FOUND_MS);
    onDone();
  }, [runId, shown, onDone, viewportRef, wasAtBottomRef]);

  return null;
};

const RUN_ANNOUNCE: Record<RunView["status"], string> = {
  budget_exceeded: "Run stopped at the spending limit",
  canceled: "Run stopped",
  completed: "Run finished",
  failed: "Run failed",
  running: "Run started",
};

const RunAnnouncer = ({ run }: { run: RunView | undefined }): ReactElement => {
  const queued = run?.status === "running" ? run.queue.length : 0;
  const asking = run?.status === "running" ? run.permissions[0] : undefined;

  const text = run
    ? asking
      ? `The agent needs your answer: ${asking.title}`
      : `${RUN_ANNOUNCE[run.status]}${queued ? `. ${queued} queued` : ""}`
    : "";

  return (
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {text}
    </p>
  );
};

const ChatLead = ({
  lead,
  empty,
}: {
  lead: ReactNode;
  empty: boolean;
}): ReactElement => <>{lead ?? <EmptyState empty={empty} />}</>;

export { ChatLead, EmptyState, RunAnnouncer, StickOnNewRun, WindowedTimeline };
