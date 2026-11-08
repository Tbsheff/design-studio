import type { ReactElement } from "react";

import { UserMessage } from "./chat-parts.js";
import type { TurnActions } from "./chat-turn-model.js";
import { RewindableTurn } from "./rewindable-turn.js";
import type { RunView } from "./run-state-model.js";
import type { TurnRewind } from "./use-rewindable-turn.js";

const UserTurn = ({
  run,
  title,
  rewind,
  actions,
}: {
  run: RunView;
  title: string | undefined;
  rewind: TurnRewind | null;
  actions: TurnActions | null;
}): ReactElement => {
  const { request } = run;

  if (!rewind || !actions || !request || request.retryOf) {
    return <UserMessage run={run} title={title} />;
  }

  return (
    <RewindableTurn
      actions={actions}
      prompt={request.prompt}
      rewind={rewind}
      run={run}
      title={title}
    />
  );
};

export { UserTurn };
