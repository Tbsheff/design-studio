import { useState } from "react";

import { getReferenceProblem } from "../../domain/reference-files.js";
import { hasNativePicker, pickFolder } from "../../platform/desktop.js";
import {
  MAX_CONTEXTS,
  toFileDraft,
  toFolderDraft,
} from "./context-drafts-model.js";
import type { ContextDraft } from "./context-drafts-model.js";
import { copy } from "./copy.js";

interface ContextDrafts {
  readonly addContextFiles: (picked: File[]) => void;
  readonly addContextFolder: (folderPath: string) => void;
  readonly contexts: ContextDraft[];
  readonly pickContextFolder: () => Promise<void>;
  readonly removeContext: (id: string) => void;
}

const toFullMessage = (): string =>
  `You can attach up to ${MAX_CONTEXTS} reference items.`;

const useContextDrafts = (
  setFormError: (message: string | null) => void
): ContextDrafts => {
  const [contexts, setContexts] = useState<ContextDraft[]>([]);

  const addDrafts = (drafts: ContextDraft[]): void => {
    if (drafts.length === 0) {
      return;
    }

    if (contexts.length + drafts.length > MAX_CONTEXTS) {
      setFormError(toFullMessage());
    }

    setContexts((current) => {
      const known = new Set(current.map((entry) => entry.id));
      const fresh = drafts.filter((draft) => !known.has(draft.id));

      return [...current, ...fresh].slice(0, MAX_CONTEXTS);
    });
  };

  const addContextFiles = (picked: File[]): void => {
    const problems: string[] = [];
    const accepted: ContextDraft[] = [];

    for (const file of picked) {
      const problem = getReferenceProblem(file);

      if (problem === null) {
        accepted.push(toFileDraft(file));
      } else {
        problems.push(problem);
      }
    }

    if (problems.length > 0) {
      setFormError(problems.join(" "));
    }

    addDrafts(accepted);
  };

  const addContextFolder = (folderPath: string): void => {
    setFormError(null);
    addDrafts([toFolderDraft(folderPath)]);
  };

  const pickContextFolder = async (): Promise<void> => {
    if (!hasNativePicker()) {
      setFormError(copy.referenceFolderNeedsDesktop);

      return;
    }

    const picked = await pickFolder({ title: copy.chooseReferenceFolder });

    if (picked.kind === "picked") {
      addContextFolder(picked.path);
    }
  };

  const removeContext = (id: string): void =>
    setContexts((current) => current.filter((entry) => entry.id !== id));

  return {
    addContextFiles,
    addContextFolder,
    contexts,
    pickContextFolder,
    removeContext,
  };
};

export { useContextDrafts };

export type { ContextDrafts };
