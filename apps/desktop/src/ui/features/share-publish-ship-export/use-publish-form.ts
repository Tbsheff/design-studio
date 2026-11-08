import { useCallback, useMemo, useState } from "react";

import {
  PUBLISH_DEFAULT_EXPIRY_DAYS,
  PUBLISH_MAX_FRAMES,
} from "../../../shared/publish.js";
import { canvasFrameChoices } from "./export-api.js";
import type { FrameChoice } from "./export-api.js";
import type {
  PublishFormPatch,
  PublishFormState,
  PublishTarget,
} from "./publish-types.js";

interface PublishFormHook {
  readonly form: PublishFormState;
  readonly frames: readonly FrameChoice[];
  readonly onPatch: (patch: PublishFormPatch) => void;
  readonly onToggle: (id: string) => void;
}

const toInitialForm = (frames: readonly FrameChoice[]): PublishFormState => ({
  expiry: PUBLISH_DEFAULT_EXPIRY_DAYS,
  hasComments: false,
  hasViewerComments: false,
  isIndexable: false,
  isPasswordOn: false,
  password: "",
  picked: new Set(
    frames.slice(0, PUBLISH_MAX_FRAMES).map((choice) => choice.id)
  ),
});

const toTogglePatch = (
  form: PublishFormState,
  id: string
): PublishFormState => {
  const picked = new Set(form.picked);

  if (picked.has(id)) {
    picked.delete(id);
  } else {
    picked.add(id);
  }

  return { ...form, picked };
};

const usePublishForm = (target: PublishTarget): PublishFormHook => {
  const frames = useMemo(
    () => canvasFrameChoices(target.projectId, target.directionId),
    [target.projectId, target.directionId]
  );

  const [form, setForm] = useState<PublishFormState>(() =>
    toInitialForm(frames)
  );

  const onPatch = useCallback((patch: PublishFormPatch): void => {
    setForm((previous) => ({ ...previous, ...patch }));
  }, []);

  const onToggle = useCallback((id: string): void => {
    setForm((previous) => toTogglePatch(previous, id));
  }, []);

  return { form, frames, onPatch, onToggle };
};

export { usePublishForm };
