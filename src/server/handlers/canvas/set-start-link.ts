import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { setStartLinkCanvas } from "../../../shared/actions/canvas/set-start-link.js";
import { LinkWriter } from "../../canvas/links/link-writer.js";
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
