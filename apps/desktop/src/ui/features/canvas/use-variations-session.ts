import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { emptySession, pickSession } from "./variations-model.js";
import type {
  BriefDraft,
  Options,
  Session,
  SessionPatch,
} from "./variations-model.js";

interface SessionControl {
  readonly options: RefObject<Options>;
  readonly patch: (change: SessionPatch) => void;
  readonly session: Session;
  readonly updateDraft: (
    update: (prev: BriefDraft | null) => BriefDraft | null
  ) => void;
}

const useVariationsSession = (input: Options): SessionControl => {
  const [stored, setStored] = useState(() => emptySession(input.projectId));
  const options = useRef(input);

  useLayoutEffect(() => {
    options.current = input;
  });

  const patch = useCallback((change: SessionPatch): void => {
    const { projectId } = options.current;
    setStored((prev) => ({ ...pickSession(prev, projectId), ...change }));
  }, []);

  const updateDraft = useCallback(
    (update: (prev: BriefDraft | null) => BriefDraft | null): void => {
      const { projectId } = options.current;

      setStored((prev) => {
        const current = pickSession(prev, projectId);

        return { ...current, draft: update(current.draft) };
      });
    },
    []
  );

  const session = pickSession(stored, input.projectId);

  return { options, patch, session, updateDraft };
};

export { useVariationsSession };

export type { SessionControl };
