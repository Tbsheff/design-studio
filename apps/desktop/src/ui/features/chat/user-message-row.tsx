import type { ReactElement, ReactNode } from "react";

import { MessageCopy } from "./message-copy.js";
import type { RunView } from "./run-state-model.js";
import { UserMessageCard } from "./user-message-card.js";

const UserMessageRow = ({
  run,
  skills,
  text,
  tools,
}: {
  run: RunView;
  skills: string[];
  text: string;
  tools: ReactNode;
}): ReactElement => (
  <div className="msg-user-row">
    {tools}
    <MessageCopy text={run.request?.prompt ?? ""} />
    <UserMessageCard run={run} skills={skills} text={text} />
  </div>
);

export { UserMessageRow };
