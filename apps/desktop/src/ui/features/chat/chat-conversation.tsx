import type { ReactElement } from "react";

import { Conversation } from "../../ai/components/ai/conversation.js";
import { ChatLog } from "./chat-log.js";
import type { ChatLogProps } from "./chat-log.js";
import { ScrollJump } from "./scroll-jump.js";
import { toStyled } from "./styled.js";

const ChatConversationRoot = toStyled(
  Conversation,
  "chat-conversation min-h-0 flex-1"
);

interface ChatConversationProps extends ChatLogProps {
  readonly isSearching: boolean;
}

const ChatConversation = ({
  isSearching,
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
}: ChatConversationProps): ReactElement => (
  <ChatConversationRoot data-ai-scope="" data-searching={isSearching || null}>
    <ChatLog
      isEmpty={isEmpty}
      items={items}
      lead={lead}
      pending={pending}
      render={render}
      resetKey={resetKey}
      reveal={reveal}
      stickRunId={stickRunId}
      suggestions={suggestions}
      workTree={workTree}
      onRevealed={onRevealed}
    />
    <ScrollJump />
  </ChatConversationRoot>
);

export { ChatConversation };
