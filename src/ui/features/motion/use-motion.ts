import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";

import { copy } from "./copy.js";
import { api, insertError } from "./deps.js";
import type {
  MotionInfo,
  MotionState,
  PreviewPort,
  SelectionContext,
} from "./deps.js";
import { draftOf, specBody } from "./motion-model.js";
import type { MotionDraft } from "./motion-model.js";
import { replay } from "./replay.js";
import type { Timer } from "./replay.js";
import { useMotionInfo } from "./use-motion-info.js";
import type { MotionIds } from "./use-motion-info.js";

interface MotionNote {
  readonly kind: "error" | "ok";
  readonly text: string;
}

interface MotionView {
  readonly busy: boolean;
  readonly draft: MotionDraft;
  readonly info: MotionInfo | null;
  readonly loading: boolean;
  readonly note: MotionNote | null;
  readonly onApply: () => Promise<void>;
  readonly onDraft: (next: MotionDraft) => void;
  readonly onPreview: () => void;
}

interface MotionScope {
  readonly hasChildren: boolean;
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly state: MotionState | null;
  readonly target: SelectionContext;
  readonly variant: string;
}

interface Edited {
  readonly base: MotionInfo | null;
  readonly draft: MotionDraft;
}

const noteOf = (
  own: MotionNote | null,
  error: string | null
): MotionNote | null => {
  if (own) {
    return own;
  }

  if (error === null) {
    return null;
  }

  return { kind: "error", text: error };
};

const currentDraft = (
  edited: Edited | null,
  info: MotionInfo | null
): MotionDraft => {
  if (edited && edited.base === info) {
    return edited.draft;
  }

  return draftOf(info);
};

const useClearOnUnmount = (timer: MutableRefObject<Timer | null>): void => {
  useEffect(
    () => (): void => {
      if (timer.current !== null) {
        globalThis.clearTimeout(timer.current);
      }
    },
    [timer]
  );
};

const useMotion = (ids: MotionIds, scope: MotionScope): MotionView => {
  const [round, setRound] = useState(0);
  const loaded = useMotionInfo(ids, scope.target, round);
  const [edited, setEdited] = useState<Edited | null>(null);
  const [busy, setBusy] = useState(false);
  const [own, setOwn] = useState<MotionNote | null>(null);
  const timer = useRef<Timer | null>(null);
  const draft = currentDraft(edited, loaded.info);
  const { info } = loaded;
  const { hasChildren, port, state, target, variant } = scope;

  useClearOnUnmount(timer);

  const onDraft = useCallback(
    (next: MotionDraft): void => {
      setEdited({ base: info, draft: next });
      setOwn(null);
    },
    [info]
  );

  const onApply = useCallback(async (): Promise<void> => {
    if (!target.source) {
      return;
    }

    setBusy(true);

    try {
      await api.setMotion(ids.projectId, ids.directionId, {
        spec: specBody(draft, state, hasChildren),
        target: {
          selector: target.selector,
          source: target.source,
          tag: target.tag,
        },
      });
      setOwn({ kind: "ok", text: copy.applied });
      setRound((count) => count + 1);
    } catch (error) {
      setOwn({ kind: "error", text: insertError(error) });
    }

    setBusy(false);
  }, [draft, hasChildren, ids, state, target]);

  const onPreview = useCallback((): void => {
    const frame = port.current;

    if (!frame || draft.kind === "none") {
      return;
    }

    if (timer.current !== null) {
      globalThis.clearTimeout(timer.current);
    }

    timer.current = replay(
      frame,
      { selector: target.selector, state, variant },
      draft
    );
  }, [draft, port, state, target.selector, variant]);

  const { loading } = loaded;
  const note = noteOf(own, loaded.error);

  return {
    busy,
    draft,
    info,
    loading,
    note,
    onApply,
    onDraft,
    onPreview,
  };
};

export { useMotion };

export type { MotionNote, MotionScope, MotionView };
