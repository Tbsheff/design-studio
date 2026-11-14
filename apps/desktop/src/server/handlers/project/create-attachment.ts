import type { Input } from "@design-studio/actions/_core/action";
import type { createAttachmentProject } from "@design-studio/actions/project/create-attachment";
import { Effect } from "effect";

import { ProjectWriter } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type CreateAttachmentProjectInput = Input<typeof createAttachmentProject>;

const handle = Effect.fn("project.createAttachment")(function* run(
  input: CreateAttachmentProjectInput
) {
  const writer = yield* ProjectWriter;

  return yield* writer.saveEncodedAttachment(input.projectId, {
    data: input.data,
    mime: input.mime,
    name: input.name,
  });
}) satisfies Handle<typeof createAttachmentProject>;

export { handle };
