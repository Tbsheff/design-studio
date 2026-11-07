import { useCallback, useState, useTransition } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { copy } from "./copy.js";
import { patternRoutes, useAction } from "./deps.js";
import { toSuggestedName, toTagList } from "./pattern-model.js";
import type { PatternTarget } from "./pattern-model.js";

interface PatternSaveSetup {
  readonly directionId: string;
  readonly onClose: () => void;
  readonly onDone: (message: string) => void;
  readonly projectId: string;
  readonly target: PatternTarget;
}

interface PatternSave {
  readonly error: string | null;
  readonly handleName: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly handleTags: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly isPending: boolean;
  readonly isValid: boolean;
  readonly name: string;
  readonly tags: string;
}

const usePatternSave = (setup: PatternSaveSetup): PatternSave => {
  const { directionId: direction, onClose, onDone, projectId: project } = setup;
  const { target: layer } = setup;
  const [name, setName] = useState(() => toSuggestedName(layer.tag));
  const [tags, setTags] = useState("");
  const [isPending, startSave] = useTransition();
  const creator = useAction(patternRoutes.createPattern);
  const { run } = creator;

  const handleName = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => setName(event.target.value),
    []
  );

  const handleTags = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => setTags(event.target.value),
    []
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      startSave(async () => {
        const saved = await run({
          directionId: direction,
          name: name.trim(),
          projectId: project,
          tags: toTagList(tags),
          target: layer,
          thumbnail: null,
        });

        if (saved !== null) {
          onDone(copy.saved);
          onClose();
        }
      });
    },
    [direction, layer, name, onClose, onDone, project, run, tags]
  );

  const isValid = name.trim() !== "";

  return {
    error: creator.error?.message ?? null,
    handleName,
    handleSubmit,
    handleTags,
    isPending,
    isValid,
    name,
    tags,
  };
};

export { usePatternSave };

export type { PatternSave, PatternSaveSetup };
