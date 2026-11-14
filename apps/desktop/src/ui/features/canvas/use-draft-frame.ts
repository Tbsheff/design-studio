import type { WireInput } from "@design-studio/actions/_core/action";
import type { listRun } from "@design-studio/actions/run/list";
import { routes } from "@design-studio/actions/run/routes";
import type { StudioEvent } from "@design-studio/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

import { useProjectEvents } from "../../platform/events.js";
import { call } from "../../platform/http.js";
import {
  isLandedDraft,
  toDraftWrite,
  toNextBuffer,
  toPageFile,
} from "./draft-frame-model.js";
import type {
  DraftBuffer,
  DraftWrite,
  RunDraftWire,
} from "./draft-frame-model.js";

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
  readonly isReady: boolean;
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
  const [loading, setLoading] = useState<number | null>(null);
  const back = 1 - front;

  if (html !== null && loading === null && html !== docs[front]) {
    if (html === docs[back]) {
      setFront(back);
    } else {
      setDocs(toDocsWith(docs, back, html));
      setLoading(back);
    }
  }

  const handleFirstLoad = useCallback(() => {
    setFront(0);
    setLoading(null);
  }, []);

  const handleSecondLoad = useCallback(() => {
    setFront(1);
    setLoading(null);
  }, []);

  return {
    docs,
    front,
    handleFirstLoad,
    handleSecondLoad,
    isReady: docs[front] !== null,
  };
};

interface DraftEditInput {
  readonly directionId: string | null;
  readonly frontToken: string | null;
  readonly projectId: string;
}

interface DraftEdit {
  readonly draft: RunDraftWire | null;
  readonly frameId: string | null;
  readonly isLanded: boolean;
}

interface RunningRun {
  readonly frameId: string | null;
  readonly id: string;
}

interface DraftFetch {
  isBusy: boolean;
  isDirty: boolean;
  runId: string | null;
}

interface DraftFeed {
  readonly draft: RunDraftWire | null;
  readonly readDraft: (runId: string) => Promise<void>;
  readonly startDraft: (runId: string, frameId: string | null) => void;
  readonly targetFrameId: string | null;
  readonly toRunId: () => string | null;
}

type ListRunInput = WireInput<typeof listRun>;

const LAND_MS = 1500;

const toListInput = (
  projectId: string,
  directionId: string | null
): ListRunInput => {
  const input: ListRunInput = {
    cursor: null,
    light: true,
    limit: 1,
    projectId,
  };

  if (directionId === null) {
    return input;
  }

  return { ...input, direction: directionId };
};

const toRunningRun = async (
  projectId: string,
  directionId: string | null
): Promise<RunningRun | null> => {
  const page = await call(routes.listRun, toListInput(projectId, directionId));

  const [latest = null] = page.items;

  if (latest === null || latest.status !== "running") {
    return null;
  }

  return { frameId: latest.request.canvas?.frameId ?? null, id: latest.id };
};

const toDraftOrNull = async (
  projectId: string,
  runId: string
): Promise<RunDraftWire | null> => {
  try {
    return await call(routes.getDraftRun, { projectId, runId });
  } catch {
    return null;
  }
};

const runDraftReads = async (
  fetch: DraftFetch,
  projectId: string,
  runId: string,
  setDraft: (draft: RunDraftWire) => void
): Promise<void> => {
  fetch.isDirty = false;
  const next = await toDraftOrNull(projectId, runId);

  if (next !== null && fetch.runId === runId) {
    setDraft(next);
  }

  if (fetch.isDirty && fetch.runId !== null) {
    await runDraftReads(fetch, projectId, fetch.runId, setDraft);
  }
};

const useDraftFeed = (projectId: string): DraftFeed => {
  const [draft, setDraft] = useState<RunDraftWire | null>(null);
  const [targetFrameId, setTargetFrameId] = useState<string | null>(null);

  const state = useRef<DraftFetch>({
    isBusy: false,
    isDirty: false,
    runId: null,
  });

  const readDraft = useCallback(
    async (runId: string): Promise<void> => {
      const fetch = state.current;

      fetch.runId = runId;

      if (fetch.isBusy) {
        fetch.isDirty = true;

        return;
      }

      fetch.isBusy = true;
      await runDraftReads(fetch, projectId, runId, setDraft);
      fetch.isBusy = false;
    },
    [projectId]
  );

  const startDraft = useCallback(
    (runId: string, frameId: string | null): void => {
      state.current.runId = runId;
      setDraft(null);
      setTargetFrameId(frameId);
    },
    []
  );

  const toRunId = useCallback((): string | null => state.current.runId, []);

  return { draft, readDraft, startDraft, targetFrameId, toRunId };
};

const useDoneToken = (
  draft: RunDraftWire | null,
  frontToken: string | null
): string | null => {
  const [doneToken, setDoneToken] = useState<string | null>(null);
  const isComplete = draft !== null && draft.isComplete;

  if (isComplete && doneToken === null) {
    setDoneToken(frontToken ?? "");
  }

  if (!isComplete && doneToken !== null) {
    setDoneToken(null);
  }

  return doneToken;
};

const useLateDraft = (feed: DraftFeed, input: DraftEditInput): void => {
  const { readDraft, startDraft } = feed;
  const { directionId, projectId } = input;

  useEffect(() => {
    let isLive = true;

    const readLate = async (): Promise<void> => {
      const running = await toRunningRun(projectId, directionId);

      if (isLive && running !== null) {
        startDraft(running.id, running.frameId);
        await readDraft(running.id);
      }
    };

    void readLate();

    return (): void => {
      isLive = false;
    };
  }, [projectId, directionId, readDraft, startDraft]);
};

const useDraftEdit = (input: DraftEditInput): DraftEdit => {
  const feed = useDraftFeed(input.projectId);
  const landToken = useDoneToken(feed.draft, input.frontToken);
  const [isRunOver, setIsRunOver] = useState(false);

  const landTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLand = (): void => {
    if (landTimer.current !== null) {
      globalThis.clearTimeout(landTimer.current);
      landTimer.current = null;
    }
  };

  useProjectEvents(input.projectId, (event: StudioEvent) => {
    if (event.directionId !== input.directionId) {
      return;
    }

    if (event.type === "run.started") {
      clearLand();
      setIsRunOver(false);
      feed.startDraft(event.runId, event.request.canvas?.frameId ?? null);
    }

    if (event.type === "run.write.delta") {
      void feed.readDraft(event.runId);
    }

    if (event.type === "run.finished" && event.runId === feed.toRunId()) {
      clearLand();

      if (feed.draft === null) {
        setIsRunOver(true);

        return;
      }

      landTimer.current = globalThis.setTimeout(
        () => setIsRunOver(true),
        LAND_MS
      );
    }
  });

  useLateDraft(feed, input);

  useEffect(
    () => (): void => {
      if (landTimer.current !== null) {
        globalThis.clearTimeout(landTimer.current);
      }
    },
    []
  );

  return {
    draft: feed.draft,
    frameId: feed.targetFrameId,
    isLanded: isLandedDraft({
      doneToken: landToken,
      frontToken: input.frontToken ?? "",
      isRunDone: isRunOver,
    }),
  };
};

export { useDraftEdit, useDraftFrame, useDraftSlots };

export type { DraftEdit, DraftSlots };
