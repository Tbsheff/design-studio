import type { DesignSystemCheckResult } from "@design-studio/contracts";
import { useCallback, useId, useState, useTransition } from "react";
import type { ReactElement } from "react";

import { cn } from "../../ai/lib/utils.js";
import { errorText } from "../../api.js";
import { saveReason } from "./draft-bar-model.js";
import { SaveAnyway } from "./save-anyway.js";

interface SaveControlsProps {
  readonly check: DesignSystemCheckResult | null;
  readonly isReady: boolean;
  readonly onSave: (force: boolean) => Promise<void>;
  readonly readyId: string;
  readonly reading: boolean;
  readonly running: boolean;
}

const toSaveLabel = (isPending: boolean): string => {
  if (isPending) {
    return "Saving…";
  }

  return "Save to library";
};

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
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const reasonId = useId();
  const reason = saveReason(check, reading, running);
  const isFailing = check !== null && !check.passed;

  const save = useCallback(
    (force: boolean): void => {
      setSaveError(null);
      startTransition(async () => {
        try {
          await onSave(force);
        } catch (error: unknown) {
          setSaveError(errorText(error));
        }
      });
    },
    [onSave]
  );

  const onSaveForced = useCallback((): void => {
    save(true);
  }, [save]);

  const onSavePlain = useCallback((): void => {
    save(false);
  }, [save]);

  return (
    <>
      {saveError && (
        <span className="alert error small" role="alert">
          {saveError}
        </span>
      )}
      {isFailing && !reading && (
        <SaveAnyway
          count={check.problems.length}
          isBusy={isPending || running}
          onSave={onSaveForced}
        />
      )}
      <span
        className="draft-save"
        data-tip={reason ?? null}
        data-tip-align="end"
      >
        <button
          type="button"
          className={cn("btn small", isReady && "primary")}
          onClick={onSavePlain}
          disabled={isPending || reason !== null}
          aria-describedby={toDescribedBy(isReady, readyId, reasonId)}
        >
          {toSaveLabel(isPending)}
        </button>
      </span>
      <span id={reasonId} className="sr-only">
        {reason}
      </span>
    </>
  );
};

export { SaveControls };
