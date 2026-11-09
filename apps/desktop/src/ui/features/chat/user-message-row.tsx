import type { ReactElement, ReactNode } from "react";

import { MessageCopy } from "./message-copy.js";
import { RememberRuleButton } from "./remember-rule-button.js";
import { RememberRuleNote } from "./remember-rule-note.js";
import type { RunView } from "./run-state-model.js";
import { useRememberRule } from "./use-remember-rule.js";
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
}): ReactElement => {
  const rule = useRememberRule(run);

  return (
    <div className="msg-user-stack">
      <div className="msg-user-row">
        {tools}
        <MessageCopy text={run.request?.prompt ?? ""} />
        <RememberRuleButton rule={rule} />
        <UserMessageCard run={run} skills={skills} text={text} />
      </div>
      <RememberRuleNote rule={rule} />
    </div>
  );
};

export { UserMessageRow };
