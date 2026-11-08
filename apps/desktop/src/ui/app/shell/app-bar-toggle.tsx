import type { FirstVersionState } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { PrepChip } from "./prep-chip";

interface AppBarToggleProps {
  readonly firstVersion: FirstVersionState | null;
  readonly framework: string;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly state: string;
  readonly statusText: string;
}

const AppBarToggle = ({
  firstVersion,
  framework,
  isOpen,
  onToggle,
  state,
  statusText,
}: AppBarToggleProps): ReactElement => (
  <button
    type="button"
    className="btn small app-bar-button"
    aria-expanded={isOpen}
    aria-haspopup="dialog"
    onClick={onToggle}
    data-tip="Routes, dev server and log"
  >
    <span className="app-status-dot" data-state={state} />
    <span>{pick(framework === "next", "Next.js", "App")}</span>
    <span className="app-panel-sub">{statusText}</span>
    <PrepChip firstVersion={firstVersion} />
  </button>
);

export { AppBarToggle };
