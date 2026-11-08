import type { RunSummary } from "@design-studio/contracts";
import { useCallback } from "react";
import type { MouseEvent, ReactElement } from "react";

import { formatRelative } from "../../domain/format.js";
import { OPTION_ROLE } from "./aria-role-model.js";
import { runLabel } from "./chat-search-hits-model.js";
import { HitStatus } from "./hit-status.js";

const ChatSearchHit = ({
  id,
  index,
  isActive,
  run,
  onActive,
  onPick,
}: {
  id: string;
  index: number;
  isActive: boolean;
  run: RunSummary;
  onActive: (index: number) => void;
  onPick: (runId: string) => void;
}): ReactElement => {
  const activate = useCallback(() => onActive(index), [onActive, index]);
  const pick = useCallback(() => onPick(run.id), [onPick, run.id]);

  const keepFocus = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => event.preventDefault(),
    []
  );

  return (
    <li id={id} role={OPTION_ROLE} aria-selected={isActive}>
      <button
        type="button"
        tabIndex={-1}
        className="ui-menu-item chat-search-hit"
        data-highlighted={isActive || null}
        onMouseEnter={activate}
        onMouseDown={keepFocus}
        onClick={pick}
      >
        <HitStatus status={run.status} />
        <span className="chat-search-hit-label">{runLabel(run)}</span>
        <span className="ui-menu-meta tabular-nums">
          {formatRelative(run.startedAt)}
        </span>
      </button>
    </li>
  );
};

export { ChatSearchHit };
