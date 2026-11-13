import type { Input } from "@design-studio/actions/_core/action";
import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { importFrameCanvas } from "@design-studio/actions/canvas/import-frame";
import { Effect } from "effect";

import {
  canvasOwner,
  FrameImportWriter,
  toImportPrompt,
} from "../../canvas/index.js";
import { RunLogWriter } from "../../run-log/index.js";
import { ProjectStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type ImportFrameCanvasInput = Input<typeof importFrameCanvas>;

const IMAGE_MIMES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const handle = Effect.fn("canvas.importFrame")(function* run(
  input: ImportFrameCanvasInput
) {
  const projects = yield* ProjectStore;
  const writer = yield* FrameImportWriter;
  const runs = yield* RunLogWriter;
  const project = yield* projects.get(input.projectId);

  const attachment = yield* projects.getAttachment(
    input.projectId,
    input.attachmentId
  );

  if (!IMAGE_MIMES.has(attachment.mime)) {
    return yield* new BadRequest({
      message: `${attachment.name} is not a PNG, JPEG or WebP image.`,
    });
  }

  const written = yield* writer.create({
    directionId: input.directionId ?? canvasOwner(project).id,
    name: input.name,
    projectId: input.projectId,
    x: input.x,
    y: input.y,
  });

  const created = { frameId: written.frameId, path: written.path };

  if (!input.shouldStartRun) {
    return { ...created, runId: null };
  }

  const reference = yield* writer.setReference(input.projectId, attachment);

  const started = yield* runs.start({
    body: {
      attachmentIds: [reference.id],
      focusPaths: [written.path],
      prompt: toImportPrompt({
        pagePath: written.path,
        prompt: input.prompt,
        sourcePath: written.sourcePath,
      }),
    },
    directionId: written.directionId,
    projectId: input.projectId,
  });

  return { ...created, runId: started.runId };
}) satisfies Handle<typeof importFrameCanvas>;

export { handle };
