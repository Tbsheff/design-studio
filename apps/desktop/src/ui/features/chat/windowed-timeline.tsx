import type { ReactElement, ReactNode } from "react";

import { useConversation } from "../../ai/components/ai/use-conversation.js";
import { EarlierRuns } from "./earlier-runs.js";
import { useScrollToRun } from "./use-chat-panel.js";
import { useHistoryWindow } from "./use-history-window.js";
import type { TimelineItem } from "./use-mcp-feed.js";
import { useStickOnNewRun } from "./use-stick-on-new-run.js";

interface TimelineProps {
  items: TimelineItem[];
  resetKey: string | null;
  reveal: string | null;
  stickRunId: string | null;
  onRevealed: () => void;
  render: (item: TimelineItem) => ReactNode;
}

const WindowedTimeline = ({
  items,
  resetKey,
  reveal,
  stickRunId,
  onRevealed,
  render,
}: TimelineProps): ReactElement => {
  const { viewportRef, wasAtBottomRef, stickToBottom } = useConversation();

  const { shown, hidden, more } = useHistoryWindow(
    items,
    resetKey,
    reveal,
    viewportRef
  );

  const inView = reveal !== null && shown.some((item) => item.key === reveal);
  useScrollToRun({
    isShown: inView,
    onDone: onRevealed,
    runId: reveal,
    viewportRef,
    wasAtBottomRef,
  });

  useStickOnNewRun(stickRunId, stickToBottom);

  return (
    <>
      <EarlierRuns hidden={hidden} onMore={more} />
      {shown.map((item) => render(item))}
    </>
  );
};

export { WindowedTimeline };
