import type { ReactElement } from "react";

import { copy as uiCopy } from "./copy.js";

interface ExportDialogTitlesProps {
  readonly versionLabel: string;
}

const ExportDialogTitles = ({
  versionLabel,
}: ExportDialogTitlesProps): ReactElement => {
  const fromVersion = `${uiCopy.fromVersion} ${versionLabel}`;

  return (
    <div className="titles" data-tip={fromVersion} data-tip-align="start">
      <h2>{uiCopy.export}</h2>
      <p className="truncate">{fromVersion}</p>
    </div>
  );
};

export { ExportDialogTitles };
