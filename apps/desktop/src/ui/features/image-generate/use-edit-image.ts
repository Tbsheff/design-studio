import { useCallback, useMemo, useState, useTransition } from "react";

import { copy } from "./copy.js";
import { imageRoutes, toImageTarget, useAction } from "./deps.js";
import type { SelectionContext } from "./deps.js";
import type { EditMode, ExpandAspect } from "./generate-model.js";

interface EditSetup {
  readonly directionId: string;
  readonly onDone: (message: string) => void;
  readonly projectId: string;
  readonly target: SelectionContext;
}

interface EditImage {
  readonly error: string | null;
  readonly handleExpand: (aspect: ExpandAspect) => void;
  readonly handleMode: (mode: EditMode) => void;
  readonly handlePrompt: (value: string) => void;
  readonly isPending: boolean;
  readonly prompt: string;
}

const toFillBox = (
  aspect: ExpandAspect | null,
  target: SelectionContext
): { height: number; width: number } | null => {
  const { height, width } = target.rect;

  if (aspect !== "fill" || width < 1 || height < 1) {
    return null;
  }

  return { height: Math.round(height), width: Math.round(width) };
};

const toPromptText = (mode: EditMode, text: string): string | null => {
  if (mode === "prompt") {
    return text;
  }

  return null;
};

const useEditImage = (setup: EditSetup): EditImage => {
  const { directionId, onDone, projectId, target } = setup;
  const update = useAction(imageRoutes.updateImage);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { run } = update;

  const send = useCallback(
    (
      mode: EditMode,
      aspect: ExpandAspect | null,
      prompt: string | null
    ): void => {
      setNote(null);

      const layer = toImageTarget(target);
      const box = toFillBox(aspect, target);

      const input = {
        aspect,
        box,
        directionId,
        layer,
        mode,
        projectId,
        prompt,
      };

      const edit = async (): Promise<void> => {
        const done = await run(input);

        if (done !== null) {
          onDone(copy.editDone);
        }
      };

      startTransition(edit);
    },
    [directionId, onDone, projectId, run, target]
  );

  const handleMode = useCallback(
    (mode: EditMode): void => {
      const text = draft.trim();

      if (mode === "prompt" && text === "") {
        setNote(copy.editNeedsPrompt);

        return;
      }

      send(mode, null, toPromptText(mode, text));
    },
    [draft, send]
  );

  const handleExpand = useCallback(
    (aspect: ExpandAspect): void => {
      send("expand", aspect, null);
    },
    [send]
  );

  const handlePrompt = setDraft;
  const message = update.error?.message ?? null;
  const error = note ?? message;

  return useMemo(
    () => ({
      error,
      handleExpand,
      handleMode,
      handlePrompt,
      isPending,
      prompt: draft,
    }),
    [draft, error, handleExpand, handleMode, handlePrompt, isPending]
  );
};

export { useEditImage };

export type { EditImage, EditSetup };
