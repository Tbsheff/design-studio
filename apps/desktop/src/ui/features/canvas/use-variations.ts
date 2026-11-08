import { VARIATION_MIN } from "@design-studio/contracts";
import type {
  Direction,
  Project,
  RunLevel,
  RunRequest,
  SelectionContext,
  VariationBrief,
  VariationBriefsResult,
} from "@design-studio/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

import { resolveRunConfig } from "../../../shared/run-levels.js";
import { errorText } from "../../api.js";
import { readStored, writeStored } from "../../platform/storage.js";
import { showVariationFrames } from "./canvas-variations-model.js";
import { maxVariationsFor, variationsApi } from "./variations-api.js";

interface BriefDraft {
  prompt: string;
  level: RunLevel;
  attachmentIds: string[];
  count: number;
  fromDirectionId: string | null;
  briefs: VariationBrief[] | null;
  result: VariationBriefsResult | null;
  loading: boolean;
  starting: boolean;
  autoStart: boolean;
  error: string | null;
  element: SelectionContext | null;
}

interface Options {
  projectId: string;
  project: Project | null;
  direction: Direction | null;
  setDirectionId: (id: string) => void;
  seedRun: (runId: string, directionId: string, request: RunRequest) => void;
}

const COUNT_KEY = "studio.variations.count";

const storedCount = (): number => {
  const raw = Number(readStored(COUNT_KEY) ?? "");

  return Number.isInteger(raw) && raw >= 1 && raw <= 4 ? raw : 1;
};

const relabel = (briefs: VariationBrief[]): VariationBrief[] =>
  briefs.map((brief, index) => ({
    ...brief,
    label: "ABCD"[index] ?? String(index + 1),
  }));

export { formatUsd as money } from "../../domain/format.js";

const budgetFor = (
  project: Project | null,
  level: RunLevel,
  count: number
): { perRun: number | null; total: number | null } => {
  if (!project) {
    return { perRun: 0, total: 0 };
  }

  const perRun = resolveRunConfig(project.settings, level).maxBudgetUsd;

  return {
    perRun,
    total: perRun === null ? null : Math.round(perRun * count * 100) / 100,
  };
};

const useVariations = (options: Options) => {
  const [count, setCountState] = useState(storedCount);
  const [draft, setDraft] = useState<BriefDraft | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [kept, setKept] = useState<string | null>(null);
  const [ask, setAsk] = useState<SelectionContext | null>(null);
  const opts = useRef(options);
  opts.current = options;
  const requestRef = useRef(0);
  const autoStartRef = useRef(false);
  const max = options.project ? maxVariationsFor(options.project.kind) : 4;
  const effectiveCount = Math.min(count, max);

  const setCount = useCallback((next: number) => {
    setCountState(next);
    writeStored(COUNT_KEY, String(next));
  }, []);

  useEffect(() => {
    setDraft(null);
    setGroupId(null);
    setNotice(null);
    setKept(null);
    setAsk(null);
  }, [options.projectId]);

  const startWith = useCallback(
    async (current: BriefDraft, briefs: VariationBrief[]) => {
      const { projectId, seedRun, direction, setDirectionId } = opts.current;
      setDraft({ ...current, error: null, starting: true });

      try {
        const result = await variationsApi.start(projectId, {
          briefs,
          fromDirectionId: current.fromDirectionId,
          level: current.level,
          prompt: current.prompt,
          ...(current.attachmentIds.length > 0
            ? { attachmentIds: current.attachmentIds }
            : {}),
          ...(current.element ? { element: current.element } : {}),
        });

        result.items.forEach((item, index) => {
          const brief = briefs[index];

          if (!item.runId || !item.directionId || !brief) {
            return;
          }

          seedRun(item.runId, item.directionId, {
            level: current.level,
            mode: "edit",
            prompt: current.prompt,
            variation: { ...brief, count: briefs.length, index },
          });
        });
        const failed = result.items.filter((item) => item.error);
        setNotice(
          failed.length > 0
            ? failed.map((item) => `${item.label}: ${item.error}`).join(" ")
            : null
        );
        setDraft(null);
        setGroupId(result.groupId);

        const ids = result.items
          .map((item) => item.directionId)
          .filter((id): id is string => Boolean(id));

        const currentId = direction?.id ?? null;

        const live = showVariationFrames(
          projectId,
          ids,
          currentId,
          !direction?.headVersionId
        );

        if (live && live !== currentId) {
          setDirectionId(live);
        }
      } catch (error) {
        setDraft({
          ...current,
          autoStart: false,
          error: errorText(error),
          starting: false,
        });
      }
    },
    []
  );

  const propose = useCallback(
    async (
      prompt: string,
      level: RunLevel,
      attachmentIds: string[],
      requestedCount?: number
    ) => {
      const { projectId, project, direction } = opts.current;

      const count =
        requestedCount === undefined
          ? effectiveCount
          : Math.min(
              requestedCount,
              project ? maxVariationsFor(project.kind) : requestedCount
            );

      const fromDirectionId = direction?.headVersionId ? direction.id : null;
      const ticket = requestRef.current + 1;
      requestRef.current = ticket;
      autoStartRef.current = false;

      const base: BriefDraft = {
        attachmentIds,
        autoStart: false,
        briefs: null,
        count,
        element: null,
        error: null,
        fromDirectionId,
        level,
        loading: true,
        prompt,
        result: null,
        starting: false,
      };

      setDraft(base);

      try {
        const result = await variationsApi.briefs(projectId, {
          count,
          fromDirectionId,
          prompt,
        });

        if (requestRef.current !== ticket) {
          return;
        }

        const ready: BriefDraft = {
          ...base,
          autoStart: autoStartRef.current,
          briefs: result.briefs,
          loading: false,
          result,
        };

        if (autoStartRef.current) {
          await startWith(ready, result.briefs);
        } else {
          setDraft(ready);
        }
      } catch (error) {
        if (requestRef.current === ticket) {
          setDraft({ ...base, error: errorText(error), loading: false });
        }
      }
    },
    [effectiveCount, startWith]
  );

  const proposeElement = useCallback(
    async (
      element: SelectionContext,
      note: string,
      requestedCount: number,
      level: RunLevel
    ) => {
      const { projectId, project, direction } = opts.current;

      const count = Math.max(
        VARIATION_MIN,
        Math.min(
          requestedCount,
          project ? maxVariationsFor(project.kind) : requestedCount
        )
      );

      const prompt =
        note.trim() || `Try different versions of this ${element.tag}`;

      const fromDirectionId = direction?.id ?? null;
      const ticket = requestRef.current + 1;
      requestRef.current = ticket;
      autoStartRef.current = true;
      setAsk(null);

      const base: BriefDraft = {
        attachmentIds: [],
        autoStart: true,
        briefs: null,
        count,
        element,
        error: null,
        fromDirectionId,
        level,
        loading: true,
        prompt,
        result: null,
        starting: false,
      };

      setDraft(base);

      try {
        const result = await variationsApi.briefs(projectId, {
          count,
          element,
          fromDirectionId,
          prompt,
        });

        if (requestRef.current !== ticket) {
          return;
        }

        const ready: BriefDraft = {
          ...base,
          briefs: result.briefs,
          loading: false,
          result,
        };

        if (autoStartRef.current) {
          await startWith(ready, result.briefs);
        } else {
          setDraft({ ...ready, autoStart: false });
        }
      } catch (error) {
        if (requestRef.current === ticket) {
          setDraft({
            ...base,
            autoStart: false,
            error: errorText(error),
            loading: false,
          });
        }
      }
    },
    [startWith]
  );

  const keepElement = useCallback(
    async (groupId: string, directionId: string) => {
      const { projectId, setDirectionId } = opts.current;
      const kept = await variationsApi.keep(projectId, groupId, directionId);
      setDirectionId(kept.directionId);

      return kept;
    },
    []
  );

  const editBrief = useCallback(
    (
      index: number,
      patch: Partial<Pick<VariationBrief, "title" | "brief">>
    ) => {
      setDraft((prev) =>
        prev?.briefs
          ? {
              ...prev,
              briefs: prev.briefs.map((brief, indexValue) =>
                indexValue === index ? { ...brief, ...patch } : brief
              ),
            }
          : prev
      );
    },
    []
  );

  const removeBrief = useCallback((index: number) => {
    setDraft((prev) =>
      prev?.briefs && prev.briefs.length > VARIATION_MIN
        ? {
            ...prev,
            briefs: relabel(
              prev.briefs.filter((_, index3) => index3 !== index)
            ),
          }
        : prev
    );
  }, []);

  const start = useCallback(() => {
    if (draft?.briefs && !draft.starting) {
      void startWith(draft, relabel(draft.briefs));
    }
  }, [draft, startWith]);

  const skip = useCallback(() => {
    if (!draft || draft.starting) {
      return;
    }

    if (draft.briefs && draft.result) {
      void startWith(draft, draft.result.briefs);

      return;
    }

    autoStartRef.current = true;
    setDraft({ ...draft, autoStart: true });
  }, [draft, startWith]);

  const mix = useCallback(
    async (
      fromDirectionId: string,
      toDirectionId: string,
      element: SelectionContext,
      level: RunLevel
    ) => {
      const { projectId, seedRun } = opts.current;

      const { runId } = await variationsApi.mix(projectId, {
        element,
        fromDirectionId,
        level,
        toDirectionId,
      });

      seedRun(runId, toDirectionId, {
        level,
        mode: "edit",
        prompt: `Use the ${element.tag} from another variation`,
      });

      return runId;
    },
    []
  );

  const cancelAll = useCallback(async (groupId: string) => {
    await variationsApi.cancel(opts.current.projectId, groupId);
  }, []);

  return {
    ask,
    askElement: setAsk,
    cancelAll,
    clearNotice: () => setNotice(null),
    count: effectiveCount,
    dismiss: () => {
      requestRef.current += 1;
      autoStartRef.current = false;
      setDraft(null);
    },
    draft,
    editBrief,
    groupId,
    keepElement,
    keepNotice: setKept,
    kept,
    max,
    mix,
    notice,
    propose,
    proposeElement,
    removeBrief,
    setCount,
    setGroupId,
    skip,
    start,
  };
};

type VariationsState = ReturnType<typeof useVariations>;

export { budgetFor, useVariations };

export type { BriefDraft, VariationsState };
