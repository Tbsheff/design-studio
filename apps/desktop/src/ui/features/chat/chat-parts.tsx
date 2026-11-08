import type { ReactElement } from "react";

import { Message } from "../../ai/components/ai/message.js";
import { splitAnswers } from "./chat-parts-model.js";
import type { UserMessageSlots } from "./chat-parts-model.js";
import { RetryMarker } from "./retry-marker.js";
import type { RunView } from "./run-state-model.js";
import { skillsFromPrompt, withoutSkillLines } from "./skills-model.js";
import { toStyled } from "./styled.js";
import { UserMessageContent } from "./user-message-content.js";

const UserMsg = toStyled(Message, "msg user");

const UserMessage = ({
  run,
  title,
  tools,
  replaceBody,
  titleSlot,
  onRename,
}: { run: RunView } & UserMessageSlots): ReactElement | null => {
  const req = run.request;

  if (!req) {
    return null;
  }

  if (req.retryOf) {
    return <RetryMarker startedAt={run.startedAt} />;
  }

  const skills = skillsFromPrompt(req.prompt);
  const { text: asked, answers } = splitAnswers(req.prompt);
  let text = asked.trim();

  if (skills.length > 0) {
    text = withoutSkillLines(asked).trim();
  }

  return (
    <UserMsg>
      <UserMessageContent
        run={run}
        title={title}
        tools={tools}
        replaceBody={replaceBody}
        titleSlot={titleSlot}
        onRename={onRename}
        skills={skills}
        text={text}
        answers={answers}
      />
    </UserMsg>
  );
};

export { UserMessage };
