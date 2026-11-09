import { ThemeButton } from "@design-studio/ui";
import type { ReactElement } from "react";

import { toBranch, toClientsText, toMcpText } from "./activity-model.js";
import type { ActivityWire } from "./activity-model.js";
import { copy } from "./copy.js";
import { toDataFlag } from "./data-flag-model.js";

interface StatusBarProps {
  readonly activity: ActivityWire | null;
  readonly folder: string | null;
  readonly model: string;
}

const isMcpLive = (activity: ActivityWire | null): boolean =>
  activity?.mcp.isRunning === true;

const StatusBar = ({
  activity,
  folder,
  model,
}: StatusBarProps): ReactElement => (
  <footer className="ide-status" aria-label={copy.statusLabel}>
    <span className="ide-seg">{model}</span>
    <span className="ide-seg">
      <span className="ide-dot" data-live={toDataFlag(isMcpLive(activity))} />
      {toMcpText(activity)}
    </span>
    <span className="ide-seg">{toClientsText(activity)}</span>
    {folder !== null && (
      <span className="ide-seg">
        <span aria-hidden="true">{copy.branchMark}</span>
        {toBranch(activity, folder)}
      </span>
    )}
    <span className="ide-seg ide-seg-end">{copy.keyHints}</span>
    <ThemeButton />
  </footer>
);

export { StatusBar };
