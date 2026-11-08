import type { ReactElement } from "react";

import { Message } from "../../ai/components/ai/message.js";
import { PendingBody } from "./pending-body.js";
import type { RunView } from "./run-state-model.js";
import { toStyled } from "./styled.js";

const AssistantMessage = toStyled(Message, "msg assistant");

const PendingAssistant = ({
  run,
  workTree,
}: {
  run: RunView;
  workTree: string | null;
}): ReactElement => (
  <AssistantMessage type="incoming">
    <PendingBody run={run} workTree={workTree} />
  </AssistantMessage>
);

export { PendingAssistant };
