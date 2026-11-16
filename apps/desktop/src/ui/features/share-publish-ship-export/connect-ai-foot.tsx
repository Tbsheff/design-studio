import type { ReactElement } from "react";

import { copy as uiCopy } from "./copy.js";

interface ConnectAiFootProps {
  readonly clients: readonly string[];
  readonly isBusy: boolean;
  readonly isEnabled: boolean;
  readonly onRotate: () => void;
}

const toClientsText = (clients: readonly string[]): string => {
  if (clients.length === 0) {
    return uiCopy.connectAiNoClients;
  }

  return `${uiCopy.connectAiConnected} ${clients.join(", ")}`;
};

const ConnectAiFoot = ({
  clients,
  isBusy,
  isEnabled,
  onRotate,
}: ConnectAiFootProps): ReactElement => (
  <div className="connect-ai-foot">
    <span className="export-sub" data-testid="connect-ai-clients-text">
      {toClientsText(clients)}
    </span>
    <button
      type="button"
      className="btn small"
      disabled={isBusy || !isEnabled}
      onClick={onRotate}
    >
      {uiCopy.newToken}
    </button>
  </div>
);

export { ConnectAiFoot };
