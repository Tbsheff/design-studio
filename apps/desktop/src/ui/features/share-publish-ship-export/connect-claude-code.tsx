import type { ReactElement } from "react";

import { ConnectCommandRow } from "./connect-command-row.js";
import { ConnectEditsRow } from "./connect-edits-row.js";
import { ConnectFootRow } from "./connect-foot-row.js";
import { ConnectHead } from "./connect-head.js";
import { copy as uiCopy } from "./copy.js";
import { useMcpStatus } from "./use-mcp-status.js";

const ConnectClaudeCode = (): ReactElement => {
  const { failure, isBusy, rotateToken, setEdits, setEnabled, status } =
    useMcpStatus();

  const isOn = status?.enabled === true;
  const alertText = status?.error ?? failure;

  return (
    <section className="export-connect" aria-label={uiCopy.connectToClaude}>
      <ConnectHead
        isOn={isOn}
        isDisabled={isBusy || status === null}
        onChange={setEnabled}
      />
      {alertText && (
        <div className="alert error small" role="alert">
          {alertText}
        </div>
      )}
      {isOn && status?.command && (
        <>
          <ConnectCommandRow command={status.command} />
          <ConnectEditsRow
            isAllowed={status.edits === true}
            isBusy={isBusy}
            onChange={setEdits}
          />
          <ConnectFootRow
            isRunning={Boolean(status.running)}
            url={String(status.url)}
            isBusy={isBusy}
            onRotate={rotateToken}
          />
        </>
      )}
    </section>
  );
};

export { ConnectClaudeCode };
