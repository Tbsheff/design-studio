import { useCallback } from "react";
import type { ReactElement } from "react";

import { AppCandidateRow } from "./app-candidate-row.js";
import type { AppChip } from "./app-chip-model.js";
import { copy } from "./copy.js";

interface AppCandidatesProps {
  readonly chip: AppChip;
  readonly onChange: (patch: Partial<AppChip>) => void;
}

const AppCandidates = ({
  chip,
  onChange,
}: AppCandidatesProps): ReactElement | null => {
  const found = chip.inspection;

  const pick = useCallback(
    (appDir: string): void => {
      onChange({ appDir });
    },
    [onChange]
  );

  if (!found || found.candidates.length < 2) {
    return null;
  }

  const chosen = chip.appDir ?? found.appDir;

  return (
    <div className="ui-menu-section" role="radiogroup" aria-label={copy.app}>
      <span className="ui-menu-label">
        {found.name}
        {copy.has}
        {found.candidates.length}
        {copy.nextJsApps}
      </span>
      {found.candidates.map((candidate) => (
        <AppCandidateRow
          key={candidate.appDir}
          appDir={candidate.appDir}
          name={candidate.name}
          isChosen={chosen === candidate.appDir}
          onPick={pick}
        />
      ))}
    </div>
  );
};

export { AppCandidates };
