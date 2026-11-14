import { createRunPageFrames } from "../canvas/index.js";
import type { DriverInput, DriverOutcome } from "./lifecycle.js";
import { changedSince } from "./screens.js";
import type { RunToolState } from "./types.js";

interface FlowFramesSegment {
  readonly notes: string[];
  readonly setup: { readonly run: RunToolState };
}

type RunPageFrames = Awaited<ReturnType<typeof createRunPageFrames>>;

const PAGE_FILE = /\.html?$/iu;

const PAGES_MAX = 40;

const isHtmlProject = (input: DriverInput): boolean =>
  input.ctx.project.kind === "html" && !input.ctx.project.app;

const isFlowRun = (input: DriverInput, outcome: DriverOutcome): boolean =>
  !input.signal.aborted &&
  outcome.status === "completed" &&
  input.ctx.request.mode === "edit" &&
  isHtmlProject(input);

const toWrittenPages = async (
  input: DriverInput,
  startedAt: number
): Promise<string[]> => {
  const changed = await changedSince(
    input.ctx.direction.workTree,
    "",
    startedAt
  );

  return changed.filter((file) => PAGE_FILE.test(file)).slice(0, PAGES_MAX);
};

const toCreated = async (
  input: DriverInput,
  pages: readonly string[]
): Promise<RunPageFrames> => {
  try {
    return await createRunPageFrames({
      directionId: input.ctx.direction.id,
      pages: [...pages],
      projectId: input.ctx.project.id,
    });
  } catch {
    return null;
  }
};

const toFlowFramesNote = (created: RunPageFrames): string | null => {
  const labels = created?.frames.map((frame) => frame.label) ?? [];

  if (labels.length === 0) {
    return null;
  }

  if (labels.length === 1) {
    return `Studio placed 1 frame: ${labels.join(", ")}.`;
  }

  return `Studio placed ${labels.length} frames: ${labels.join(", ")}.`;
};

const createFlowFrames = async (
  input: DriverInput,
  segment: FlowFramesSegment,
  outcome: DriverOutcome
): Promise<void> => {
  const { startedAt = null } = segment.setup.run;

  if (startedAt === null || !isFlowRun(input, outcome)) {
    return;
  }

  const pages = await toWrittenPages(input, startedAt);

  if (pages.length === 0) {
    return;
  }

  const note = toFlowFramesNote(await toCreated(input, pages));

  if (note !== null) {
    segment.notes.push(note);
  }
};

export { createFlowFrames };
