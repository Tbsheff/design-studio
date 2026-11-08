import { useCallback, useState, startTransition } from "react";

import { isReferenceName } from "../../../shared/reference.js";
import type { PendingAttachment } from "../../domain/pending-attachment.js";
import { markAsReference, unmarkReference } from "./reference-upload.js";

interface ReferenceToggle {
  readonly busyId: string | null;
  readonly toggle: (file: PendingAttachment) => void;
}

const useReferenceToggle = (files: PendingAttachment[]): ReferenceToggle => {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const toggle = useCallback(
    (file: PendingAttachment): void => {
      if (busyId !== null || !file.attachment) {
        return;
      }

      const isOn = isReferenceName(file.attachment.name);

      for (const entry of files) {
        unmarkReference(entry);
      }

      if (isOn) {
        setTick((previous) => previous + 1);

        return;
      }

      setBusyId(file.localId);
      startTransition(async () => {
        try {
          await markAsReference(file);
        } catch (error: unknown) {
          file.error = String(error);

          if (error instanceof Error) {
            file.error = error.message;
          }
        }

        setBusyId(null);
        setTick((previous) => previous + 1);
      });
    },
    [busyId, files]
  );

  return { busyId, toggle };
};

export { useReferenceToggle };
