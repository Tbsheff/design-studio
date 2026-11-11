import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { shortcutLabel } from "../../../shared/keymap.js";
import { IS_MAC } from "../../chat-slots.js";
import { copy } from "./copy.js";
import { elapsedText, statusLabel } from "./live-status-model.js";
import { isLiveRun } from "./run-state-model.js";
import type { RunView } from "./run-state-model.js";
import { useElapsed } from "./use-elapsed.js";

const STOP_ICON_SIZE = 12;

const LiveStatus = ({
  run,
  workTree,
  isOffline,
  onStop,
}: {
  run: RunView;
  workTree: string | null;
  isOffline: boolean;
  onStop: (() => void) | null;
}): ReactElement => {
  const elapsed = useElapsed(run.startedAt, true);
  const now = run.startedAt + elapsed;
  const isLive = isLiveRun(run, now);

  return (
    <div
      className="ui-status live-status"
      data-testid="live-status"
      data-offline={isOffline || null}
      data-stalled={!isLive || null}
    >
      <span className="ui-status-mark" aria-hidden="true" />
      <span className="live-label min-w-0 truncate">
        {statusLabel(run, workTree, now, isOffline)}
      </span>
      {run.hasStarted && (
        <span className="live-elapsed tabular-nums">
          {elapsedText(elapsed)}
        </span>
      )}
      {onStop && isLive && (
        <button
          type="button"
          className="icon-btn small live-stop"
          aria-label={copy.stopRun}
          data-tip={`Stop (${shortcutLabel("stop", IS_MAC)})`}
          data-tip-align="end"
          onClick={onStop}
        >
          <Icon name="stop" size={STOP_ICON_SIZE} />
        </button>
      )}
    </div>
  );
};

export { LiveStatus };
