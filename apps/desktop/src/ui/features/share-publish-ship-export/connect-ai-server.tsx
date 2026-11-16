import { useCallback } from "react";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import type { ConnectSetup } from "./connect-ai-api.js";
import { ConnectAiTitles } from "./connect-ai-titles.js";
import { ConnectEditsRow } from "./connect-edits-row.js";
import { ConnectTrustedRow } from "./connect-trusted-row.js";
import { copy as uiCopy } from "./copy.js";
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

const ConnectAiServer = ({
  setup,
  state,
}: ConnectAiServerProps): ReactElement => {
  const { failure, isBusy } = state;
  const { setEdits, setEnabled, setTrustedFolders } = state;

  const toggleEnabled = useCallback(
    (): void => setEnabled(!setup.isEnabled),
    [setEnabled, setup.isEnabled]
  );

  return (
    <section className="connect-ai-server">
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
      {setup.isEnabled && (
        <ConnectTrustedRow
          isBusy={isBusy}
          setup={setup}
          onChange={setTrustedFolders}
        />
      )}
    </section>
  );
};

export { ConnectAiServer };
