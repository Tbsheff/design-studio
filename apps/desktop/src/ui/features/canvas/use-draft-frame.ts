import { useCallback, useEffect, useRef, useState } from "react";

import { useProjectEvents } from "../../platform/events.js";
import { toDraftWrite, toNextBuffer, toPageFile } from "./draft-frame-model.js";
import type { DraftBuffer, DraftWrite } from "./draft-frame-model.js";

interface DraftFrameInput {
  readonly directionId: string | null;
  readonly path: string | undefined;
  readonly projectId: string;
  readonly shouldShow: boolean;
}

const REFRESH_MS = 250;

const useDraftFrame = (input: DraftFrameInput): DraftWrite | null => {
  const [draft, setDraft] = useState<DraftWrite | null>(null);
  const buffer = useRef<DraftBuffer | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pagePath = toPageFile(input.path);

  const flush = (): void => {
    timer.current = null;

    if (buffer.current !== null) {
      setDraft(toDraftWrite(buffer.current, pagePath));
    }
  };

  useProjectEvents(input.projectId, (event) => {
    if (
      event.type === "run.started" &&
      event.directionId === input.directionId
    ) {
      buffer.current = null;
      setDraft(null);
    }

    if (
      event.type !== "run.write.delta" ||
      event.directionId !== input.directionId
    ) {
      return;
    }

    buffer.current = toNextBuffer(buffer.current, event);

    if (timer.current === null) {
      timer.current = globalThis.setTimeout(flush, REFRESH_MS);
    }
  });

  useEffect(
    () => (): void => {
      if (timer.current !== null) {
        globalThis.clearTimeout(timer.current);
      }
    },
    []
  );

  if (!input.shouldShow) {
    return null;
  }

  return draft;
};

type DraftDocs = readonly [string | null, string | null];

interface DraftSlots {
  readonly docs: DraftDocs;
  readonly front: number;
  readonly handleFirstLoad: () => void;
  readonly handleSecondLoad: () => void;
}

const toDocsWith = (
  docs: DraftDocs,
  index: number,
  html: string
): DraftDocs => {
  if (index === 0) {
    return [html, docs[1]];
  }

  return [docs[0], html];
};

const useDraftSlots = (html: string | null): DraftSlots => {
  const [docs, setDocs] = useState<DraftDocs>([null, null]);
  const [front, setFront] = useState(0);
  const [seen, setSeen] = useState<string | null>(null);

  if (html !== seen) {
    setSeen(html);

    if (html !== null) {
      setDocs(toDocsWith(docs, 1 - front, html));
    }
  }

  const handleFirstLoad = useCallback(() => setFront(0), []);
  const handleSecondLoad = useCallback(() => setFront(1), []);

  return { docs, front, handleFirstLoad, handleSecondLoad };
};

export { useDraftFrame, useDraftSlots };

export type { DraftSlots };
