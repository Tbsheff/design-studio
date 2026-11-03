import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { useConversation } from "../../ai/components/ai/conversation.js";
import type { TimelineItem } from "../../components/McpFeed.js";
import { Icon } from "../../kit/Icon.js";
import type { RunView } from "../../runState.js";
import { EarlierRuns, useHistoryWindow } from "./chat-panel-window.js";

function StickOnNewRun({ runId }: { runId: string | null }) {
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
}

interface TimelineProps {
  items: TimelineItem[];
  resetKey: string | null;
  reveal: string | null;
  onRevealed: () => void;
  render: (item: TimelineItem) => ReactNode;
}

function WindowedTimeline({
  items,
  resetKey,
  reveal,
  onRevealed,
  render,
}: TimelineProps) {
  const { shown, hidden, more } = useHistoryWindow(items, resetKey, reveal);
  const inView = reveal !== null && shown.some((item) => item.key === reveal);

  return (
    <>
      <EarlierRuns hidden={hidden} onMore={more} />
      {shown.map(render)}
      <ScrollToRun runId={reveal} shown={inView} onDone={onRevealed} />
    </>
  );
}

function EmptyChat() {
  return (
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
}

function EmptyState({ empty }: { empty: boolean }) {
  return empty ? <EmptyChat /> : null;
}

const FOUND_MS = 1600;

function ScrollToRun({
  runId,
  shown,
  onDone,
}: {
  runId: string | null;
  shown: boolean;
  onDone: () => void;
}) {
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
    window.setTimeout(() => delete el.dataset.found, FOUND_MS);
    onDone();
  }, [runId, shown, onDone, viewportRef, wasAtBottomRef]);

  return null;
}

const RUN_ANNOUNCE: Record<RunView["status"], string> = {
  running: "Run started",
  completed: "Run finished",
  canceled: "Run stopped",
  failed: "Run failed",
  budget_exceeded: "Run stopped at the spending limit",
};

function RunAnnouncer({ run }: { run: RunView | undefined }) {
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
}

function ChatLead({ lead, empty }: { lead: ReactNode; empty: boolean }) {
  return <>{lead ?? <EmptyState empty={empty} />}</>;
}

export { StickOnNewRun, WindowedTimeline, EmptyState, RunAnnouncer, ChatLead };
