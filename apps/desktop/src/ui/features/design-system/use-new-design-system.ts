import { useCallback, useState, useTransition } from "react";
import type { FormEvent } from "react";

import { errorText } from "../../api.js";
import { packApi } from "../../platform/pack-api.js";
import { hasSource, toFormData } from "./nds-model.js";
import { EMPTY } from "./new-design-system-values.js";
import type { DraftForm, Patch } from "./new-design-system-values.js";
import { refreshPacks } from "./packs.js";
import { useDropGuard } from "./use-drop-guard.js";

interface NewDesignSystemState {
  failure: string | null;
  form: DraftForm;
  isBusy: boolean;
  isReady: boolean;
  set: (patch: Patch) => void;
  submit: (event: FormEvent) => void;
}

const useNewDesignSystem = (
  onCreated: (projectId: string) => void
): NewDesignSystemState => {
  const [form, setForm] = useState<DraftForm>(EMPTY);
  const [isBusy, startTransition] = useTransition();
  const [failure, setFailure] = useState<string | null>(null);

  const set = useCallback((patch: Patch): void => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const isReady = hasSource(form) && !isBusy;
  useDropGuard();

  const submit = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();

      if (!isReady) {
        return;
      }

      setFailure(null);
      startTransition(async () => {
        try {
          const result = await packApi.createDesignSystemDraft(
            toFormData(form)
          );

          refreshPacks();
          onCreated(result.project.id);
        } catch (error: unknown) {
          setFailure(errorText(error));
        }
      });
    },
    [form, isReady, onCreated]
  );

  return { failure, form, isBusy, isReady, set, submit };
};

export { useNewDesignSystem };

export type { NewDesignSystemState };
