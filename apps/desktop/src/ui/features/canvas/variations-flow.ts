import { VARIATION_MAX, VARIATION_MIN } from "@design-studio/contracts";
import type {
  Direction,
  Project,
  RunLevel,
  SelectionContext,
  VariationBrief,
} from "@design-studio/contracts";
import type { RefObject } from "react";

import { errorText } from "../../api.js";
import { showVariationFrames } from "./canvas-variations-model.js";
import { maxVariationsFor, variationsApi } from "./variations-api.js";
import {
  toElementPrompt,
  toFailedNotice,
  toLoadingDraft,
  toStartRequest,
} from "./variations-model.js";
import type { BriefDraft, Options, SessionPatch } from "./variations-model.js";

interface Flow {
  autoStart: boolean;
  request: number;
}

interface FlowContext {
  readonly flow: RefObject<Flow>;
  readonly patch: (change: SessionPatch) => void;
  readonly settings: RefObject<Options>;
}

const seedStarted = (
  options: Options,
  current: BriefDraft,
  briefs: VariationBrief[],
  items: Awaited<ReturnType<typeof variationsApi.start>>["items"]
): void => {
  for (const [index, item] of items.entries()) {
    const brief = briefs[index];

    if (item.runId && item.directionId && brief) {
      options.seedRun(item.runId, item.directionId, {
        level: current.level,
        mode: "edit",
        prompt: current.prompt,
        variation: { ...brief, count: briefs.length, index },
      });
    }
  }
};

const showStarted = (
  options: Options,
  items: Awaited<ReturnType<typeof variationsApi.start>>["items"]
): void => {
  const { projectId, direction, setDirectionId } = options;

  const ids = items
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
};

const startVariations = async (
  context: FlowContext,
  current: BriefDraft,
  briefs: VariationBrief[]
): Promise<void> => {
  const options = context.settings.current;
  context.patch({ draft: { ...current, error: null, starting: true } });

  try {
    const result = await variationsApi.start(
      options.projectId,
      toStartRequest(current, briefs)
    );

    seedStarted(options, current, briefs, result.items);
    context.patch({
      draft: null,
      groupId: result.groupId,
      notice: toFailedNotice(result.items),
    });
    showStarted(options, result.items);
  } catch (error) {
    context.patch({
      draft: {
        ...current,
        autoStart: false,
        error: errorText(error),
        starting: false,
      },
    });
  }
};

const toProjectMax = (project: Project | null): number => {
  if (project) {
    return maxVariationsFor(project.kind);
  }

  return VARIATION_MAX;
};

const toClampedCount = (requested: number, project: Project | null): number => {
  if (project) {
    return Math.min(requested, maxVariationsFor(project.kind));
  }

  return requested;
};

const toElementCount = (requested: number, project: Project | null): number =>
  Math.max(VARIATION_MIN, toClampedCount(requested, project));

const toFromDirectionId = (direction: Direction | null): string | null => {
  if (direction?.headVersionId) {
    return direction.id;
  }

  return null;
};

const armAutoStart = (flow: Flow): void => {
  flow.autoStart = true;
};

const dismissFlow = (flow: Flow): void => {
  flow.request += 1;
  flow.autoStart = false;
};

const toWantedCount = (
  fallback: number,
  requested: number | null,
  project: Project | null
): number => {
  if (requested === null) {
    return fallback;
  }

  return toClampedCount(requested, project);
};

const nextTicket = (flow: Flow, isAutoStart: boolean): number => {
  flow.request += 1;
  flow.autoStart = isAutoStart;

  return flow.request;
};

const proposeBriefs = async (
  context: FlowContext,
  input: {
    prompt: string;
    level: RunLevel;
    attachmentIds: string[];
    count: number;
  }
): Promise<void> => {
  const { projectId, direction } = context.settings.current;
  const { flow } = context;
  const ticket = nextTicket(flow.current, false);
  const fromDirectionId = toFromDirectionId(direction);

  const base = toLoadingDraft({
    ...input,
    autoStart: false,
    element: null,
    fromDirectionId,
  });

  context.patch({ draft: base });

  try {
    const { count, prompt } = input;

    const result = await variationsApi.briefs(projectId, {
      count,
      fromDirectionId,
      prompt,
    });

    if (flow.current.request !== ticket) {
      return;
    }

    const ready: BriefDraft = {
      ...base,
      autoStart: flow.current.autoStart,
      briefs: result.briefs,
      loading: false,
      result,
    };

    if (flow.current.autoStart) {
      await startVariations(context, ready, result.briefs);

      return;
    }

    context.patch({ draft: ready });
  } catch (error) {
    if (flow.current.request === ticket) {
      context.patch({
        draft: { ...base, error: errorText(error), loading: false },
      });
    }
  }
};

const proposeElementBriefs = async (
  context: FlowContext,
  input: {
    element: SelectionContext;
    note: string;
    count: number;
    level: RunLevel;
  }
): Promise<void> => {
  const { projectId, project, direction } = context.settings.current;
  const { flow } = context;
  const { element, level } = input;
  const count = toElementCount(input.count, project);
  const prompt = toElementPrompt(input.note, element);
  const fromDirectionId = direction?.id ?? null;
  const ticket = nextTicket(flow.current, true);
  context.patch({ ask: null });

  const base = toLoadingDraft({
    attachmentIds: [],
    autoStart: true,
    count,
    element,
    fromDirectionId,
    level,
    prompt,
  });

  context.patch({ draft: base });

  try {
    const result = await variationsApi.briefs(projectId, {
      count,
      element,
      fromDirectionId,
      prompt,
    });

    if (flow.current.request !== ticket) {
      return;
    }

    const ready: BriefDraft = {
      ...base,
      briefs: result.briefs,
      loading: false,
      result,
    };

    if (flow.current.autoStart) {
      await startVariations(context, ready, result.briefs);

      return;
    }

    context.patch({ draft: { ...ready, autoStart: false } });
  } catch (error) {
    if (flow.current.request === ticket) {
      context.patch({
        draft: {
          ...base,
          autoStart: false,
          error: errorText(error),
          loading: false,
        },
      });
    }
  }
};

export {
  armAutoStart,
  dismissFlow,
  proposeBriefs,
  proposeElementBriefs,
  startVariations,
  toClampedCount,
  toProjectMax,
  toWantedCount,
};

export type { Flow, FlowContext };
