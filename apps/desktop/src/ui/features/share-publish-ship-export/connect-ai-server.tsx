import { useCallback } from "react";
import type { ReactElement } from "react";

import type { ConnectSetup } from "./connect-ai-api.js";
import { ConnectAiTitles } from "./connect-ai-titles.js";
import { ConnectEditsRow } from "./connect-edits-row.js";
import { copy as uiCopy } from "./copy.js";
import { pick } from "./pick.js";
import { ToggleSwitch } from "./toggle-switch.js";
import type { ConnectAiState } from "./use-connect-ai.js";

interface ConnectAiServerProps {
  readonly setup: ConnectSetup;
  readonly state: ConnectAiState;
}

const toServerText = (setup: ConnectSetup): string => {
  if (!setup.isEnabled) {
    return uiCopy.connectAiServerNote;
  }

  return pick(
    setup.isRunning,
    `${uiCopy.runningAt} ${setup.url}`,
    uiCopy.notRunning
  );
};

const toClientsText = (clients: readonly string[]): string => {
  if (clients.length === 0) {
    return uiCopy.connectAiNoClients;
  }

  return `${uiCopy.connectAiConnected} ${clients.join(", ")}`;
};

const ConnectAiServer = ({
  setup,
  state,
}: ConnectAiServerProps): ReactElement => {
  const { clients, failure, isBusy, rotateToken, setEdits, setEnabled } = state;

  const toggleEnabled = useCallback(
    (): void => setEnabled(!setup.isEnabled),
    [setEnabled, setup.isEnabled]
  );

  return (
    <section className="export-connect connect-ai-server">
      <div className="export-connect-head">
        <ConnectAiTitles title={uiCopy.mcpServer} note={toServerText(setup)} />
        <ToggleSwitch
          label={uiCopy.mcpServer}
          isOn={setup.isEnabled}
          isDisabled={isBusy}
          onToggle={toggleEnabled}
        />
      </div>
      {failure !== null && (
        <div className="alert error small" role="alert">
          {failure}
        </div>
      )}
      {setup.isEnabled && (
        <ConnectEditsRow
          isAllowed={setup.canEdit}
          isBusy={isBusy}
          onChange={setEdits}
        />
      )}
      <div className="export-connect-foot">
        <span className="export-sub" data-testid="connect-ai-clients-text">
          {toClientsText(clients)}
        </span>
        <button
          type="button"
          className="btn small ghost"
          disabled={isBusy}
          onClick={rotateToken}
        >
          {uiCopy.newToken}
        </button>
      </div>
    </section>
  );
};

export { ConnectAiServer };
