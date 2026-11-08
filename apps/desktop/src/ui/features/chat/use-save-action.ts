import { useCallback, useState, useTransition } from "react";

import { errorText } from "../../api.js";

interface SaveAction {
  readonly isPending: boolean;
  readonly isSaved: boolean;
  readonly onSaveForced: () => void;
  readonly onSavePlain: () => void;
  readonly saveError: string | null;
}

const useSaveAction = (
  onSave: (force: boolean) => Promise<void>
): SaveAction => {
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const save = useCallback(
    (force: boolean): void => {
      setSaveError(null);
      setIsSaved(false);
      startTransition(async () => {
        try {
          await onSave(force);
          setIsSaved(true);
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

  return { isPending, isSaved, onSaveForced, onSavePlain, saveError };
};

export { useSaveAction };
