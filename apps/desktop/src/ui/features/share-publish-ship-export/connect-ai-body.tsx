import type { ReactElement } from "react";

import { ConnectAiAgent } from "./connect-ai-agent.js";
import { ConnectAiFoot } from "./connect-ai-foot.js";
import { ConnectAiServer } from "./connect-ai-server.js";
import type { ConnectAiState } from "./use-connect-ai.js";

interface ConnectAiBodyProps {
  readonly state: ConnectAiState;
}

const ConnectAiBody = ({ state }: ConnectAiBodyProps): ReactElement => {
  const { clients, failure, isBusy, rotateToken, setup } = state;

  return (
    <div className="modal-body connect-ai-body">
      {setup !== null && <ConnectAiServer setup={setup} state={state} />}
      {setup !== null && <ConnectAiAgent setup={setup} />}
      {setup !== null && (
        <ConnectAiFoot
          clients={clients}
          isBusy={isBusy}
          onRotate={rotateToken}
        />
      )}
      {setup === null && failure !== null && (
        <div className="alert error small" role="alert">
          {failure}
        </div>
      )}
    </div>
  );
};

export { ConnectAiBody };
