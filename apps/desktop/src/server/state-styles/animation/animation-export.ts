import path from "node:path";

import { runCapture } from "./animation-capture.js";
import type { AnimationScope } from "./animation-scope.js";
import { loadConfig } from "./deps.js";
import {
  toComponentName,
  toAnimationCss,
  toReactSource,
} from "./engine/index.js";
import type { AnimationModel } from "./engine/index.js";

type AnimationExportFormat = "css" | "react" | "webm";

interface AnimationExport {
  readonly bytes: number;
  readonly code: string | null;
  readonly format: AnimationExportFormat;
  readonly mimeType: string;
  readonly notes: readonly string[];
  readonly path: string | null;
}

const toTextExport = (
  format: "css" | "react",
  code: string,
  mimeType: string,
  notes: readonly string[]
): AnimationExport => {
  const bytes = Buffer.byteLength(code);

  return { bytes, code, format, mimeType, notes, path: null };
};

const toCssExport = (model: AnimationModel): AnimationExport =>
  toTextExport("css", toAnimationCss(model), "text/css", [
    `Add this stylesheet to the page. It targets ${model.tracks.length} layer selector(s) and respects prefers-reduced-motion.`,
    "Scroll and in-view triggers use animation-timeline; a browser without it shows the end state.",
  ]);

const toReactExport = (model: AnimationModel): AnimationExport =>
  toTextExport("react", toReactSource(model), "text/plain", [
    `Mount <${toComponentName(model.name)} /> once on the page. It finds the layers by CSS selector and plays the timeline with the Web Animations API.`,
    "With prefers-reduced-motion it sets the end state and plays nothing.",
  ]);

const toWebmExport = async (
  scope: AnimationScope,
  model: AnimationModel
): Promise<AnimationExport> => {
  const out = path.join(
    loadConfig().dataDir,
    "animations",
    scope.project.id,
    scope.direction.id,
    `${model.id}.webm`
  );

  const result = await runCapture({
    model,
    out,
    workTree: scope.workTree,
  });

  return {
    bytes: result.bytes,
    code: null,
    format: "webm",
    mimeType: "video/webm",
    notes: [
      `Recorded ${result.frames} frames at 30 fps, 1280 by 720, from ${model.file}.`,
    ],
    path: out,
  };
};

const toAnimationExport = async (
  scope: AnimationScope,
  model: AnimationModel,
  format: AnimationExportFormat
): Promise<AnimationExport> => {
  if (format === "css") {
    return toCssExport(model);
  }

  if (format === "react") {
    return toReactExport(model);
  }

  return await toWebmExport(scope, model);
};

export { toAnimationExport };

export type { AnimationExport, AnimationExportFormat };
