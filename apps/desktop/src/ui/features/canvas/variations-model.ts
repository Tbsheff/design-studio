import { VARIATION_MAX, VARIATION_MIN } from "@design-studio/contracts";
import type {
  Direction,
  Project,
  RunLevel,
  RunRequest,
  SelectionContext,
  VariationBrief,
  VariationBriefsResult,
  VariationStartItem,
  VariationStartRequest,
} from "@design-studio/contracts";

import { readStored } from "../../platform/storage.js";
import type { CanvasLayout } from "./canvas-frames-model.js";

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

interface Session {
  ask: SelectionContext | null;
  draft: BriefDraft | null;
  groupId: string | null;
  kept: string | null;
  keptLayout: CanvasLayout | null;
  notice: string | null;
  projectId: string;
}

type SessionPatch = Partial<Omit<Session, "projectId">>;

const COUNT_KEY = "studio.variations.count";

const BRIEF_LABELS = "ABCD";

const toStoredCount = (): number => {
  const raw = Number(readStored(COUNT_KEY) ?? "");

  if (Number.isInteger(raw) && raw >= 1 && raw <= VARIATION_MAX) {
    return raw;
  }

  return 1;
};

const relabel = (briefs: VariationBrief[]): VariationBrief[] =>
  briefs.map((brief, index) => ({
    ...brief,
    label: BRIEF_LABELS[index] ?? String(index + 1),
  }));

const emptySession = (projectId: string): Session => ({
  ask: null,
  draft: null,
  groupId: null,
  kept: null,
  keptLayout: null,
  notice: null,
  projectId,
});

const pickSession = (session: Session, projectId: string): Session => {
  if (session.projectId === projectId) {
    return session;
  }

  return emptySession(projectId);
};

const toStartRequest = (
  current: BriefDraft,
  briefs: VariationBrief[]
): VariationStartRequest => {
  const request: VariationStartRequest = {
    briefs,
    fromDirectionId: current.fromDirectionId,
    level: current.level,
    prompt: current.prompt,
  };

  if (current.attachmentIds.length > 0) {
    request.attachmentIds = current.attachmentIds;
  }

  if (current.element) {
    request.element = current.element;
  }

  return request;
};

const toFailedNotice = (items: VariationStartItem[]): string | null => {
  const failed = items.filter((item) => item.error);

  if (failed.length === 0) {
    return null;
  }

  return failed.map((item) => `${item.label}: ${item.error}`).join(" ");
};

const toLoadingDraft = (
  draft: Pick<
    BriefDraft,
    | "attachmentIds"
    | "count"
    | "element"
    | "fromDirectionId"
    | "level"
    | "prompt"
  > & { autoStart: boolean }
): BriefDraft => ({
  ...draft,
  briefs: null,
  error: null,
  loading: true,
  result: null,
  starting: false,
});

const toElementPrompt = (note: string, element: SelectionContext): string =>
  note.trim() || `Try different versions of this ${element.tag}`;

const toTrimmedDraft = (
  prev: BriefDraft | null,
  index: number
): BriefDraft | null => {
  if (!prev?.briefs || prev.briefs.length <= VARIATION_MIN) {
    return prev;
  }

  return {
    ...prev,
    briefs: relabel(prev.briefs.toSpliced(index, 1)),
  };
};

const toPatchedDraft = (
  prev: BriefDraft | null,
  index: number,
  patch: Partial<Pick<VariationBrief, "title" | "brief">>
): BriefDraft | null => {
  if (!prev?.briefs) {
    return prev;
  }

  return {
    ...prev,
    briefs: prev.briefs.map((brief, position) => {
      if (position === index) {
        return { ...brief, ...patch };
      }

      return brief;
    }),
  };
};

export {
  emptySession,
  pickSession,
  relabel,
  toElementPrompt,
  toFailedNotice,
  toLoadingDraft,
  toPatchedDraft,
  toStartRequest,
  toStoredCount,
  toTrimmedDraft,
};

export type { BriefDraft, Options, Session, SessionPatch };
