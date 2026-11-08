import { useCallback } from "react";
import type { ReactElement } from "react";

import { ChatConversation } from "./chat-conversation.js";
import { ChatSearch } from "./chat-search.js";
import { McpItem } from "./mcp-item.js";
import { isChatEmpty } from "./mcp-timeline.js";
import { RunAnnouncer } from "./run-announcer.js";
import { TimelineRun } from "./timeline-run.js";
import { useChatPanelState } from "./use-chat-panel-state.js";
import type { ChatPanelProps } from "./use-chat-panel-state.js";
import type { TimelineItem } from "./use-mcp-feed.js";

const ChatPanel = (props: ChatPanelProps): ReactElement => {
  const { runs, pending = null, direction, lead } = props;
  const mcp = props.mcp ?? null;

  const { context, lastId, search, timeline, workTree } =
    useChatPanelState(props);

  const {
    open: isSearchOpen,
    target,
    onClose,
    onQuery,
    onPick,
    onFound,
  } = search;

  const render = useCallback(
    (item: TimelineItem): ReactElement => {
      if (item.kind === "run") {
        return (
          <TimelineRun key={item.run.runId} run={item.run} context={context} />
        );
      }

      return <McpItem key={item.key} item={item} mcp={mcp} />;
    },
    [context, mcp]
  );

  return (
    <div className="chat-wrap">
      <RunAnnouncer run={pending ?? runs.at(-1)} />
      {isSearchOpen && (
        <ChatSearch
          query={search.query}
          directionId={direction?.id ?? null}
          onClose={onClose}
          onQuery={onQuery}
          onPick={onPick}
        />
      )}
      <ChatConversation
        isSearching={isSearchOpen}
        isEmpty={isChatEmpty(runs.length, pending, mcp)}
        items={timeline}
        lead={lead}
        pending={pending}
        render={render}
        resetKey={direction?.id ?? null}
        reveal={target}
        stickRunId={pending?.runId ?? lastId}
        workTree={workTree}
        onRevealed={onFound}
      />
    </div>
  );
};

export { ChatPanel };

export type { ChatPanelProps };
