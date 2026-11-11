import type { DesignSystemState, Project } from "@design-studio/contracts";
import { useCallback, useId } from "react";
import type { ReactElement } from "react";

import { REGION_ROLE } from "./aria-role-model.js";
import { copy } from "./copy.js";
import { toDraftChip } from "./draft-bar-model.js";
import { DraftChip } from "./draft-chip.js";
import { improvePassed } from "./draft-improve-model.js";
import { DraftPop } from "./draft-pop.js";
import type { RunView } from "./run-state-model.js";
import { useDraftChip } from "./use-draft-chip.js";
import { useDraftInfo } from "./use-draft-info.js";
import type { DraftChange } from "./use-draft-info.js";

interface DraftBodyProps {
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
  lastRun,
  reading,
  running,
}: DraftBodyProps): ReactElement => {
  const readyId = useId();
  const popId = useId();
  const { chipRef, isOpen, onToggle, rootRef } = useDraftChip();

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
      ref={rootRef}
      className="draft-bar"
      role={REGION_ROLE}
      aria-label={copy.designSystemDraft}
    >
      {isReady && (
        <span id={readyId} className="sr-only">
          {copy.theAiRunPassed}
        </span>
      )}
      <DraftChip
        chip={toDraftChip(check, error, reading, running)}
        chipRef={chipRef}
        isOpen={isOpen}
        popId={popId}
        onToggle={onToggle}
      />
      <DraftPop
        id={popId}
        isOpen={isOpen}
        check={check}
        coverage={coverage}
        error={error}
        isReady={isReady}
        lastRun={lastRun}
        readyId={readyId}
        reading={reading}
        running={running}
        onSave={onSaveNamed}
      />
    </div>
  );
};

export { DraftBody };

export type { DraftBodyProps };
