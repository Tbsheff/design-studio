import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { PaneError } from "./pane-error";

interface PaneStatusProps {
  readonly connection: string;
  readonly error: string | null;
  readonly onDismiss: () => void;
}

const PaneStatus = ({
  connection,
  error,
  onDismiss,
}: PaneStatusProps): ReactElement => {
  const text = pick(
    connection === "connecting",
    "Connecting…",
    "Reconnecting…"
  );

  return (
    <>
      {connection !== "open" && (
        <output className="conn pane-conn" data-tip={text}>
          <span className="spinner" />
          <span className="sr-only">{text}</span>
        </output>
      )}
      {error && <PaneError error={error} onDismiss={onDismiss} />}
    </>
  );
};

export { PaneStatus };
