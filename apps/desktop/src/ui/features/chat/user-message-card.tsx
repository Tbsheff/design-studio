import type { ReactElement } from "react";

import { MessageText } from "../../ai/components/ai/message-text.js";
import { RequestChips } from "./request-chips.js";
import type { RunView } from "./run-state-model.js";
import { toStyled } from "./styled.js";

const BodyText = toStyled(
  MessageText,
  "msg-body whitespace-pre-wrap wrap-anywhere"
);

const UserMessageCard = ({
  run,
  skills,
  text,
}: {
  run: RunView;
  skills: string[];
  text: string;
}): ReactElement => (
  <div className="msg-card">
    {text && <BodyText>{text}</BodyText>}
    <RequestChips run={run} skills={skills} />
  </div>
);

export { UserMessageCard };
