import { useState } from "react";

import { MAX_REFERENCES } from "../../domain/image-limits.js";
import type { ReferenceDraft } from "./composer-drafts-model.js";

interface ReferenceDrafts {
  readonly addReference: (reference: ReferenceDraft) => void;
  readonly references: ReferenceDraft[];
  readonly removeReference: (url: string) => void;
}

const useReferenceDrafts = (
  setFormError: (message: string | null) => void
): ReferenceDrafts => {
  const [references, setReferences] = useState<ReferenceDraft[]>([]);

  const addReference = (reference: ReferenceDraft): void => {
    setReferences((current) => {
      if (current.some((item) => item.url === reference.url)) {
        return current;
      }

      if (current.length >= MAX_REFERENCES) {
        setFormError(`You can add up to ${MAX_REFERENCES} reference pages.`);

        return current;
      }

      return [...current, reference];
    });
  };

  const removeReference = (url: string): void =>
    setReferences((current) => current.filter((item) => item.url !== url));

  return { addReference, references, removeReference };
};

export { useReferenceDrafts };

export type { ReferenceDrafts };
