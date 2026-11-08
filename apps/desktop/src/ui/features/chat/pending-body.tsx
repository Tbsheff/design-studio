import type { ReactElement } from "react";

import { MessageContent } from "../../ai/components/ai/message-content.js";
import { LiveStatus } from "./live-status.js";
import type { RunView } from "./run-state-model.js";
import { toStyled } from "./styled.js";

const BodyContent = toStyled(MessageContent, "run-body gap-3");

const PendingBody = ({
  run,
  workTree,
}: {
  run: RunView;
  workTree: string | null;
}): ReactElement => (
  <BodyContent>
    <LiveStatus run={run} workTree={workTree} isOffline={false} onStop={null} />
  </BodyContent>
);

export { PendingBody };
