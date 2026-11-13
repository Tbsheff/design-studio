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

interface DraftEditInput {
  readonly directionId: string | null;
  readonly frontToken: string | null;
  readonly projectId: string;
}

interface DraftEdit {
  readonly draft: RunDraftWire | null;
  readonly isLanded: boolean;
}

interface DraftFetch {
  isBusy: boolean;
  isDirty: boolean;
  runId: string | null;
}

interface DraftFeed {
  readonly draft: RunDraftWire | null;
  readonly readDraft: (runId: string) => Promise<void>;
  readonly startDraft: (runId: string) => void;
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

const toRunningRunId = async (
  projectId: string,
  directionId: string | null
): Promise<string | null> => {
  const page = await call(routes.listRun, toListInput(projectId, directionId));

  const [latest = null] = page.items;

  if (latest === null || latest.status !== "running") {
    return null;
  }

  return latest.id;
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

  const startDraft = useCallback((runId: string): void => {
    state.current.runId = runId;
    setDraft(null);
  }, []);

  const toRunId = useCallback((): string | null => state.current.runId, []);

  return { draft, readDraft, startDraft, toRunId };
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

const useLateDraft = (
  feed: DraftFeed,
  projectId: string,
  directionId: string | null
): void => {
  const { readDraft } = feed;

  useEffect(() => {
    let isLive = true;

    const readLate = async (): Promise<void> => {
      const runId = await toRunningRunId(projectId, directionId);

      if (isLive && runId !== null) {
        await readDraft(runId);
      }
    };

    void readLate();

    return (): void => {
      isLive = false;
    };
  }, [projectId, directionId, readDraft]);
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
      feed.startDraft(event.runId);
    }

    if (event.type === "run.write.delta") {
      void feed.readDraft(event.runId);
    }

    if (event.type === "run.finished" && event.runId === feed.toRunId()) {
      clearLand();
      landTimer.current = globalThis.setTimeout(
        () => setIsRunOver(true),
        LAND_MS
      );
    }
  });

  useLateDraft(feed, input.projectId, input.directionId);

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
    isLanded: isLandedDraft({
      doneToken: landToken,
      frontToken: input.frontToken ?? "",
      isRunDone: isRunOver,
    }),
  };
};

export { useDraftEdit, useDraftFrame, useDraftSlots };

export type { DraftEdit, DraftSlots };
