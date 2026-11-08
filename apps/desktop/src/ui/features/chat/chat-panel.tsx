import type { Direction } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "../../ai/components/ai/conversation.js";
import {
  ChatLead,
  RunAnnouncer,
  StickOnNewRun,
  WindowedTimeline,
} from "./chat-panel-parts.js";
import { PendingEntry, RunEntry } from "./chat-run-entry.js";
import { ChatSearch } from "./chat-search.js";
import { reviewOf, turnProps, undoProps } from "./chat-turn-model.js";
import type { McpFeedControl } from "./mcp-feed.js";
import { feedShown, McpItem, timelineOf } from "./mcp-feed.js";
import type { RunView } from "./run-state-model.js";
import {
  useLatest,
  usePolish,
  useRunSearch,
  useTurnActions,
} from "./use-chat-panel.js";
import type { RewindControl } from "./use-rewind.js";

interface Props {
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

const ChatPanel = ({
  runs,
  pending = null,
  direction,
  onDetails,
  running,
  busy,
  onPolish,
  onRetry,
  onApprovePlan,
  rewind,
  mcp = null,
  lead,
  offline,
  onStop,
  onReview,
}: Props) => {
  const workTree = direction?.workTree ?? null;
  const headVersionId = direction?.headVersionId ?? null;
  const detailsRef = useLatest(onDetails);

  const openDetails = useCallback(
    (runId: string) => detailsRef.current(runId),
    [detailsRef]
  );

  const reviewRef = useLatest(onReview);

  const openReview = useCallback(
    (versionId: string) => reviewRef.current?.(versionId),
    [reviewRef]
  );

  const polish = usePolish({
    headVersionId,
    onApprovePlan,
    onPolish,
    onRetry,
    polishing: running || busy,
  });

  const { titles, actions } = useTurnActions(rewind);
  const search = useRunSearch(runs.length > 1);
  const lastId = runs.at(-1)?.runId;
  const timeline = useMemo(() => timelineOf(runs, mcp), [runs, mcp]);
  const isOffline = Boolean(offline);

  const renderRun = (run: RunView) => (
    <RunEntry
      key={run.runId}
      run={run}
      latest={run.runId === lastId}
      workTree={workTree}
      onDetails={openDetails}
      polish={polish}
      offline={isOffline}
      onStop={onStop}
      reviewVersionId={reviewOf(run, rewind)}
      onReview={onReview ? openReview : null}
      {...undoProps(run, rewind)}
      {...turnProps(
        run,
        rewind,
        titles[run.runId] ?? run.summary?.title,
        actions
      )}
    />
  );

  return (
    <div className="chat-wrap">
      <RunAnnouncer run={pending ?? runs.at(-1)} />
      {search.open && (
        <ChatSearch
          query={search.query}
          directionId={direction?.id ?? null}
          onClose={search.onClose}
          onQuery={search.onQuery}
          onPick={search.onPick}
        />
      )}
      <Conversation
        className="chat-conversation min-h-0 flex-1"
        data-ai-scope=""
        data-searching={search.open || undefined}
      >
        <ConversationContent className="chat">
          <ChatLead
            lead={lead}
            empty={runs.length === 0 && !pending && !feedShown(mcp)}
          />
          <WindowedTimeline
            items={timeline}
            resetKey={direction?.id ?? null}
            reveal={search.target}
            onRevealed={search.onFound}
            render={(item) =>
              item.kind === "run" ? (
                renderRun(item.run)
              ) : (
                <McpItem key={item.key} item={item} mcp={mcp} />
              )
            }
          />
          {pending && <PendingEntry run={pending} workTree={workTree} />}
        </ConversationContent>
        <StickOnNewRun runId={pending?.runId ?? lastId ?? null} />
        <ConversationScrollButton className="btn small chat-scroll-btn">
          <Icon name="chevronDown" size={14} />
          Jump to latest
        </ConversationScrollButton>
      </Conversation>
    </div>
  );
};

export { ChatPanel };

export type { Props as ChatPanelProps };
