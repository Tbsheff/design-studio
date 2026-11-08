import type { FrameChoice } from "./export-api.js";
import type { FrameLabel } from "./frame-label.js";

interface FrameNamers {
  readonly nameOf: (
    projectId: string,
    frameId: string,
    fallback: string
  ) => string;
  readonly pageOf: (path: string | undefined) => string;
}

const toFrameLabels = (
  projectId: string,
  frames: readonly FrameChoice[],
  namers: FrameNamers
): ReadonlyMap<string, FrameLabel> =>
  new Map(
    frames.map((choice) => [
      choice.id,
      {
        name: namers.nameOf(projectId, choice.id, choice.frame.name),
        page: namers.pageOf(choice.frame.path),
      },
    ])
  );

export { toFrameLabels };

export type { FrameNamers };
