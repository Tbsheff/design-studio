import type { ReactElement } from "react";

import { Message } from "../../ai/components/ai/message.js";
import { RunBodyContent } from "./run-body-content.js";
import type { RunBodyContentProps } from "./run-body-content.js";
import { toStyled } from "./styled.js";

const AssistantMessage = toStyled(Message, "msg assistant");

const RunBody = ({
  tail,
  workTree,
  isOffline,
  undo,
  onRetry,
  onStop,
}: RunBodyContentProps): ReactElement => (
  <AssistantMessage type="incoming">
    <RunBodyContent
      tail={tail}
      workTree={workTree}
      isOffline={isOffline}
      undo={undo}
      onRetry={onRetry}
      onStop={onStop}
    />
  </AssistantMessage>
);

export { RunBody };
