import type { Direction } from "@design-studio/contracts";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { timelineOf } from "./mcp-timeline.js";
import type { RunView } from "./run-state-model.js";
import { usePolish, useRunSearch, useTurnActions } from "./use-chat-panel.js";
import type { McpFeedControl, TimelineItem } from "./use-mcp-feed.js";
import type { RewindControl } from "./use-rewind.js";
import type { TimelineRunContext } from "./use-timeline-context.js";
import { useTimelineContext } from "./use-timeline-context.js";

interface ChatPanelProps {
  rewind?: RewindControl;
  runs: RunView[];
  pending?: RunView | null;
  direction: Direction | null;
  onDetails: (runId: string) => void;
  running: boolean;
  busy: boolean;
  onPolish: () => void;
  onRetry?: (run: RunView) => void;
  onApprovePlan?: (run: RunView) => void;
  mcp?: McpFeedControl | null;
  lead?: ReactNode;
  offline?: boolean;
  onStop?: () => void;
  onReview?: (versionId: string) => void;
}

interface ChatPanelState {
  readonly context: TimelineRunContext;
  readonly lastId: string | null;
  readonly search: ReturnType<typeof useRunSearch>;
  readonly timeline: TimelineItem[];
  readonly workTree: string | null;
}

const useChatPanelState = (props: ChatPanelProps): ChatPanelState => {
  const { runs, direction, rewind, running, busy } = props;
  const mcp = props.mcp ?? null;
  const workTree = direction?.workTree ?? null;

  const polish = usePolish({
    headVersionId: direction?.headVersionId ?? null,
    onApprovePlan: props.onApprovePlan,
    onPolish: props.onPolish,
    onRetry: props.onRetry,
    polishing: running || busy,
  });

  const { titles, actions } = useTurnActions(rewind);
  const search = useRunSearch(runs.length > 1);
  const lastId = runs.at(-1)?.runId ?? null;
  const timeline = useMemo(() => timelineOf(runs, mcp), [runs, mcp]);

  const detailsSource = props.onDetails;
  const isOffline = Boolean(props.offline);
  const reviewSource = props.onReview;
  const stopSource = props.onStop;

  const context = useTimelineContext({
    actions,
    detailsSource,
    isOffline,
    lastId,
    polish,
    reviewSource,
    rewind,
    stopSource,
    titles,
    workTree,
  });

  return { context, lastId, search, timeline, workTree };
};

export { useChatPanelState };

export type { ChatPanelProps };
