import { useState } from "react";
import type { ReactElement } from "react";

import { ConnectAiClients } from "./connect-ai-clients.js";
import type { ConnectClientId } from "./connect-ai-model.js";
import { ConnectAiServer } from "./connect-ai-server.js";
import { ConnectAiSnippet } from "./connect-ai-snippet.js";
import type { ConnectAiState } from "./use-connect-ai.js";

interface ConnectAiBodyProps {
  readonly state: ConnectAiState;
}

const ConnectAiBody = ({ state }: ConnectAiBodyProps): ReactElement => {
  const [clientId, setClientId] = useState<ConnectClientId>("claude-code");
  const { failure, setup } = state;

  return (
    <div className="modal-body connect-ai-body">
      <ConnectAiClients selected={clientId} onSelect={setClientId} />
      {setup !== null && <ConnectAiSnippet clientId={clientId} setup={setup} />}
      {setup !== null && <ConnectAiServer setup={setup} state={state} />}
      {setup === null && failure !== null && (
        <div className="alert error small" role="alert">
          {failure}
        </div>
      )}
    </div>
  );
};

export { ConnectAiBody };
