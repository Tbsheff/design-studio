import { Effect } from "effect";

import type { Input } from "@design-studio/actions/_core/action";
import type { setStartLinkCanvas } from "@design-studio/actions/canvas/set-start-link";
import { LinkWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type SetStartLinkCanvasInput = Input<typeof setStartLinkCanvas>;

const handle = Effect.fn("canvas.setStartLink")(function* run(
  input: SetStartLinkCanvasInput
) {
  const writer = yield* LinkWriter;
  const links = yield* writer.setStart(input.projectId, input.frame);

  return { links };
}) satisfies Handle<typeof setStartLinkCanvas>;

export { handle };
