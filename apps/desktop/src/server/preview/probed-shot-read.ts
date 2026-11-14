import { readScreenshot } from "./frame-shot-read.js";
import type { FrameDeps, ScreenshotView, ShotQuery } from "./frame-source.js";
import { toProbedPreview } from "./probed-preview.js";

interface ProbedShot {
  readonly probe: string | null;
  readonly view: ScreenshotView;
}

const getProbedShot = async (
  deps: FrameDeps,
  query: ShotQuery,
  expression: string
): Promise<ProbedShot> => {
  const found: string[] = [];

  const view = await readScreenshot(
    {
      preview: toProbedPreview(deps.preview, expression, found),
      projects: deps.projects,
      versions: deps.versions,
    },
    query
  );

  return { probe: found.at(-1) ?? null, view };
};

export { getProbedShot };

export type { ProbedShot };
