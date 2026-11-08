import type { DesignSystemState, Project } from "@design-studio/contracts";
import { useCallback, useId } from "react";
import type { ReactElement, ReactNode } from "react";

import { REGION_ROLE } from "./aria-role-model.js";
import { copy } from "./copy.js";
import { improvePassed } from "./draft-improve-model.js";
import { DraftSummary } from "./draft-summary.js";
import type { RunView } from "./run-state-model.js";
import { SaveControls } from "./save-controls.js";
import { useDraftInfo } from "./use-draft-info.js";
import type { DraftChange } from "./use-draft-info.js";

interface DraftBodyProps {
  readonly improve: ReactNode;
  readonly lastChange: DraftChange | null;
  readonly lastRun: RunView | null;
  readonly onSave: (
    name: string,
    packId: string,
    force: boolean
  ) => Promise<void>;
  readonly packId: string;
  readonly packName: string | null;
  readonly project: Project;
  readonly reading: boolean;
  readonly running: boolean;
  readonly state: DesignSystemState | null;
}

const DraftBody = ({
  packId,
  packName,
  project,
  state,
  lastChange,
  onSave,
  improve,
  lastRun,
  reading,
  running,
}: DraftBodyProps): ReactElement => {
  const readyId = useId();

  const { coverage, check, error } = useDraftInfo(
    project.id,
    lastChange,
    lastRun?.status
  );

  const name = state?.manifest?.name ?? packName ?? project.name;

  const isReady = Boolean(check?.passed) && improvePassed(lastRun);

  const onSaveNamed = useCallback(
    (force: boolean): Promise<void> => onSave(name, packId, force),
    [name, onSave, packId]
  );

  return (
    <div
      className="draft-bar"
      role={REGION_ROLE}
      aria-label={copy.designSystemDraft}
    >
      {isReady && (
        <span id={readyId} className="sr-only">
          {copy.theAiRunPassed}
        </span>
      )}
      <DraftSummary
        name={name}
        coverage={coverage}
        check={check}
        run={lastRun}
        error={error}
      />
      <div className="draft-actions">
        {improve}
        <SaveControls
          check={check}
          isReady={isReady}
          readyId={readyId}
          reading={reading}
          running={running}
          onSave={onSaveNamed}
        />
      </div>
    </div>
  );
};

export { DraftBody };

export type { DraftBodyProps };
