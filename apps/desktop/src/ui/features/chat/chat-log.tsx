import type { ReactElement, ReactNode } from "react";

import { ConversationContent } from "../../ai/components/ai/conversation-content.js";
import { EmptyState } from "./empty-state.js";
import { PendingEntry } from "./pending-entry.js";
import type { RunView } from "./run-state-model.js";
import { toStyled } from "./styled.js";
import type { TimelineItem } from "./use-mcp-feed.js";
import { WindowedTimeline } from "./windowed-timeline.js";

const LogContent = toStyled(ConversationContent, "chat");

interface ChatLogProps {
  readonly isEmpty: boolean;
  readonly items: TimelineItem[];
  readonly lead: ReactNode;
  readonly pending: RunView | null;
  readonly render: (item: TimelineItem) => ReactNode;
  readonly resetKey: string | null;
  readonly reveal: string | null;
  readonly stickRunId: string | null;
  readonly suggestions: ReactNode;
  readonly workTree: string | null;
  readonly onRevealed: () => void;
}

const ChatLog = ({
  isEmpty,
  items,
  lead,
  pending,
  render,
  resetKey,
  reveal,
  stickRunId,
  suggestions,
  workTree,
  onRevealed,
}: ChatLogProps): ReactElement => (
  <LogContent>
    <EmptyState lead={lead} empty={isEmpty} />
    <WindowedTimeline
      items={items}
      resetKey={resetKey}
      reveal={reveal}
      stickRunId={stickRunId}
      onRevealed={onRevealed}
      render={render}
    />
    {pending && <PendingEntry run={pending} workTree={workTree} />}
    {suggestions}
  </LogContent>
);

export { ChatLog };

export type { ChatLogProps };
