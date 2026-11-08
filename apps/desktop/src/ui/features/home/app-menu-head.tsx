import { shortenHome } from "@design-studio/contracts/folders";
import type { ReactElement } from "react";

import type { AppChip } from "./app-chip-model.js";
import { copy } from "./copy.js";

const PRIVATE_PREFIX = /^\/private(?=\/)/u;

interface AppMenuHeadProps {
  readonly chip: AppChip;
  readonly homeDir: string | null;
  readonly problem: string | null;
}

const AppMenuHead = ({
  chip,
  homeDir,
  problem,
}: AppMenuHeadProps): ReactElement => {
  const found = chip.inspection;

  return (
    <div className="ui-menu-section">
      <span className="ui-menu-label mono truncate">
        {shortenHome(
          (found?.path ?? chip.path).replace(PRIVATE_PREFIX, ""),
          homeDir
        )}
      </span>
      {problem && (
        <p className="home-app-note" role="alert">
          {problem}
        </p>
      )}
      {found?.workspace && (
        <p className="home-app-note">
          {copy.opensAsPartOfThe}
          {found.workspace.name}
          {copy.monorepo}
        </p>
      )}
      {found?.projectId && (
        <p className="home-app-note">{copy.alreadyAProjectReturnOpens}</p>
      )}
    </div>
  );
};

export { AppMenuHead };
