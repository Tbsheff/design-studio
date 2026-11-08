import type { DesignSystemCheckResult } from "@design-studio/contracts";
import { useCallback, useId } from "react";
import type { ReactElement } from "react";

import { cn } from "../../ai/lib/utils.js";
import { uiStore } from "../../platform/storage.js";
import { saveReason } from "./draft-bar-model.js";
import { SaveAnyway } from "./save-anyway.js";
import { SavedNote } from "./saved-note.js";
import { useSaveAction } from "./use-save-action.js";

interface SaveControlsProps {
  readonly check: DesignSystemCheckResult | null;
  readonly isReady: boolean;
  readonly onSave: (force: boolean) => Promise<void>;
  readonly readyId: string;
  readonly reading: boolean;
  readonly running: boolean;
}

const SAVE_LABEL = "Use for new projects";

const toDescribedBy = (
  isReady: boolean,
  readyId: string,
  reasonId: string
): string => {
  if (isReady) {
    return readyId;
  }

  return reasonId;
};

const SaveControls = ({
  check,
  isReady,
  readyId,
  reading,
  running,
  onSave,
}: SaveControlsProps): ReactElement => {
  const { isPending, isSaved, onSaveForced, onSavePlain, saveError } =
    useSaveAction(onSave);

  const reasonId = useId();
  const reason = saveReason(check, reading, running);
  const isFailing = check !== null && !check.passed;
  const isBlocked = isPending || reason !== null;

  const onSaveClick = useCallback((): void => {
    if (!isBlocked) {
      onSavePlain();
    }
  }, [isBlocked, onSavePlain]);

  const onOpenLibrary = useCallback((): void => {
    uiStore.set({
      activeProjectId: null,
      libraryFrom: null,
      screen: "design-systems",
    });
  }, []);

  return (
    <>
      {saveError && (
        <span className="alert error small" role="alert">
          {saveError}
        </span>
      )}
      {isSaved && !saveError && <SavedNote onOpen={onOpenLibrary} />}
      {isFailing && !reading && (
        <SaveAnyway
          count={check.problems.length}
          isBusy={isPending || running}
          onSave={onSaveForced}
        />
      )}
      <span className="draft-save">
        <button
          type="button"
          className={cn("btn small", isReady && "primary")}
          onClick={onSaveClick}
          aria-busy={isPending}
          aria-disabled={reason !== null}
          aria-describedby={toDescribedBy(isReady, readyId, reasonId)}
          data-tip={reason ?? null}
          data-tip-align="end"
        >
          {SAVE_LABEL}
        </button>
      </span>
      <span id={reasonId} className="sr-only">
        {reason}
      </span>
    </>
  );
};

export { SaveControls };
