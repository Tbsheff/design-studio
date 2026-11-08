import { useCallback, useMemo, useState, useTransition } from "react";

import { copy } from "./copy.js";
import { imageRoutes, toImageTarget, useAction } from "./deps.js";
import type { SelectionContext } from "./deps.js";
import type { EditMode } from "./generate-model.js";

interface EditSetup {
  readonly directionId: string;
  readonly onDone: (message: string) => void;
  readonly projectId: string;
  readonly target: SelectionContext;
}

interface EditImage {
  readonly error: string | null;
  readonly handleMode: (mode: EditMode) => void;
  readonly handlePrompt: (value: string) => void;
  readonly isPending: boolean;
  readonly prompt: string;
}

const useEditImage = (setup: EditSetup): EditImage => {
  const { directionId, onDone, projectId, target } = setup;
  const update = useAction(imageRoutes.updateImage);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { run } = update;

  const handleMode = useCallback(
    (mode: EditMode): void => {
      const text = draft.trim();

      if (mode === "prompt" && text === "") {
        setNote(copy.editNeedsPrompt);

        return;
      }

      setNote(null);

      const layer = toImageTarget(target);
      let prompt: string | null = null;

      if (mode === "prompt") {
        prompt = text;
      }

      const edit = async (): Promise<void> => {
        const done = await run({ directionId, layer, mode, projectId, prompt });

        if (done !== null) {
          onDone(copy.editDone);
        }
      };

      startTransition(edit);
    },
    [directionId, draft, onDone, projectId, run, target]
  );

  const handlePrompt = setDraft;
  const message = update.error?.message ?? null;
  const error = note ?? message;

  return useMemo(
    () => ({ error, handleMode, handlePrompt, isPending, prompt: draft }),
    [draft, error, handleMode, handlePrompt, isPending]
  );
};

export { useEditImage };

export type { EditImage, EditSetup };
