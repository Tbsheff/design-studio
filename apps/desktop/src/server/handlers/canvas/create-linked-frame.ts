import type { Input } from "@design-studio/actions/_core/action";
import type { createLinkedFrameCanvas } from "@design-studio/actions/canvas/create-linked-frame";
import { Effect } from "effect";

import {
  canvasOwner,
  LinkedFrameWriter,
  toLinkedPrompt,
} from "../../canvas/index.js";
import { RunLogWriter } from "../../run-log/index.js";
import { ProjectStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type CreateLinkedFrameCanvasInput = Input<typeof createLinkedFrameCanvas>;

const handle = Effect.fn("canvas.createLinkedFrame")(function* run(
  input: CreateLinkedFrameCanvasInput
) {
  const projects = yield* ProjectStore;
  const writer = yield* LinkedFrameWriter;
  const runs = yield* RunLogWriter;
  const project = yield* projects.get(input.projectId);

  const written = yield* writer.create({
    directionId: input.directionId ?? canvasOwner(project).id,
    fromFrame: input.fromFrame,
    label: input.label,
    path: input.path,
    projectId: input.projectId,
    selector: input.selector,
  });

  const created = {
    frameId: written.frameId,
    linkId: written.linkId,
    path: written.path,
  };

  if (!input.shouldStartRun) {
    return { ...created, runId: null };
  }

  const runPrompt = toLinkedPrompt({
    label: written.label,
    pagePath: written.path,
    prompt: input.prompt,
    sourcePath: written.sourcePath,
  });

  const started = yield* runs.start({
    body: { focusPaths: [written.path], prompt: runPrompt },
    directionId: written.directionId,
    projectId: input.projectId,
  });

  return { ...created, runId: started.runId };
}) satisfies Handle<typeof createLinkedFrameCanvas>;

export { handle };
