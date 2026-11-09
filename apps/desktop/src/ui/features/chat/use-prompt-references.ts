import { useState } from "react";

import { api, errorText } from "../../api.js";
import { getReferenceProblem } from "../../domain/reference-files.js";
import { hasNativePicker, pickFolder } from "../../platform/desktop.js";
import { copy } from "./copy.js";
import {
  toFolderLabel,
  toImportingNote,
  toSettledNote,
} from "./reference-note-model.js";
import type { ReferenceNote } from "./reference-note-model.js";
import { useReferenceUrl } from "./use-reference-url.js";
import type { ReferenceUrl } from "./use-reference-url.js";

interface PromptReferences {
  readonly addReferenceFiles: (files: File[]) => void;
  readonly dismissReference: (id: string) => void;
  readonly notes: ReferenceNote[];
  readonly pickReferenceFolder: () => Promise<void>;
  readonly url: ReferenceUrl;
}

const usePromptReferences = (
  projectId: string,
  setError: (message: string | null) => void
): PromptReferences => {
  const [notes, setNotes] = useState<ReferenceNote[]>([]);

  const settle = (
    note: ReferenceNote,
    state: "added" | "failed",
    message: string | null
  ): void =>
    setNotes((current) =>
      current.map((entry) => {
        if (entry.id === note.id) {
          return toSettledNote(entry, state, message);
        }

        return entry;
      })
    );

  const runImport = async (
    label: string,
    start: () => Promise<{ readonly fileCount: number }>
  ): Promise<void> => {
    const note = toImportingNote(label);
    setNotes((current) => [...current, note]);

    try {
      const imported = await start();
      settle(note, "added", `${imported.fileCount} files`);
    } catch (error) {
      settle(note, "failed", errorText(error));
    }
  };

  const addReferenceFiles = (files: File[]): void => {
    for (const file of files) {
      const problem = getReferenceProblem(file);

      if (problem === null) {
        runImport(file.name, () => api.importReferenceFile(projectId, file));
      } else {
        setError(problem);
      }
    }
  };

  const pickReferenceFolder = async (): Promise<void> => {
    if (!hasNativePicker()) {
      setError(copy.referenceFolderNeedsDesktop);

      return;
    }

    const picked = await pickFolder({ title: copy.chooseReferenceFolder });

    if (picked.kind === "picked") {
      await runImport(toFolderLabel(picked.path), () =>
        api.importReferencePath(projectId, picked.path)
      );
    }
  };

  const dismissReference = (id: string): void =>
    setNotes((current) => current.filter((entry) => entry.id !== id));

  const url = useReferenceUrl(projectId, runImport);

  return {
    addReferenceFiles,
    dismissReference,
    notes,
    pickReferenceFolder,
    url,
  };
};

export { usePromptReferences };

export type { PromptReferences };
