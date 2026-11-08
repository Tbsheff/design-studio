import type { ReactElement } from "react";

import { MessageContent } from "../../ai/components/ai/message-content.js";
import { AnsweredCard } from "./answered-card.js";
import type { ClarifyAnswer, UserMessageSlots } from "./chat-parts-model.js";
import type { RunView } from "./run-state-model.js";
import { UserMessageMeta } from "./user-message-meta.js";
import { UserMessageRow } from "./user-message-row.js";

interface UserMessageContentProps extends UserMessageSlots {
  readonly run: RunView;
  readonly skills: string[];
  readonly text: string;
  readonly answers: ClarifyAnswer[];
}

const UserMessageContent = ({
  run,
  title,
  tools,
  replaceBody,
  titleSlot,
  onRename,
  skills,
  text,
  answers,
}: UserMessageContentProps): ReactElement => (
  <MessageContent>
    <UserMessageMeta
      run={run}
      title={title}
      titleSlot={titleSlot}
      onRename={onRename}
    />
    {replaceBody}
    {!replaceBody && (
      <UserMessageRow run={run} skills={skills} text={text} tools={tools} />
    )}
    <AnsweredCard answers={answers} />
  </MessageContent>
);

export { UserMessageContent };
