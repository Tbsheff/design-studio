import { useState } from "react";
import type { ReactElement } from "react";

import type { ConnectSetup } from "./connect-ai-api.js";
import { ConnectAiClients } from "./connect-ai-clients.js";
import type { ConnectClientId } from "./connect-ai-model.js";
import { ConnectAiSnippet } from "./connect-ai-snippet.js";
import { copy as uiCopy } from "./copy.js";

interface ConnectAiAgentProps {
  readonly setup: ConnectSetup;
}

const ConnectAiAgent = ({ setup }: ConnectAiAgentProps): ReactElement => {
  const [clientId, setClientId] = useState<ConnectClientId>("claude-code");

  return (
    <section className="connect-ai-agent" aria-label={uiCopy.connectAiAgent}>
      <h3>{uiCopy.connectAiAgent}</h3>
      {!setup.isEnabled && <p className="export-sub">{uiCopy.connectAiOff}</p>}
      {setup.isEnabled && (
        <ConnectAiClients selected={clientId} onSelect={setClientId} />
      )}
      {setup.isEnabled && (
        <ConnectAiSnippet clientId={clientId} setup={setup} />
      )}
    </section>
  );
};

export { ConnectAiAgent };
