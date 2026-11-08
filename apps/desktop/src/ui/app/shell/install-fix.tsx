import { CopyButton } from "@design-studio/ui";
import type { ReactElement } from "react";

import type { FolderInspection } from "../../../shared/open-app";
import { copy } from "./copy";

interface InstallFixProps {
  readonly hint: FolderInspection | null;
}

const InstallFix = ({ hint }: InstallFixProps): ReactElement | null => {
  const install = hint?.install;

  if (!hint || hint.depsInstalled !== false || !install) {
    return null;
  }

  const full = `cd ${JSON.stringify(install.dir)} && ${install.command}`;

  return (
    <div className="app-fail-fix">
      <span className="app-fail-label">{copy.installTheDependenciesInA}</span>
      <div className="app-fail-cmd">
        <code className="truncate">{full}</code>
        <CopyButton text={full} label="Copy the install command" />
      </div>
    </div>
  );
};

export { InstallFix };
