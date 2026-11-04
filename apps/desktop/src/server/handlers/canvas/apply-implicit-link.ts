import { Effect } from "effect";

import type { Input } from "../../../shared/actions/_core/action.js";
import type { applyImplicitLinkCanvas } from "../../../shared/actions/canvas/apply-implicit-link.js";
import { LinkWriter } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type ApplyImplicitLinkCanvasInput = Input<typeof applyImplicitLinkCanvas>;

const handle = Effect.fn("canvas.applyImplicitLink")(function* run(
  input: ApplyImplicitLinkCanvasInput
) {
  const writer = yield* LinkWriter;

  return yield* writer.keep(input);
}) satisfies Handle<typeof applyImplicitLinkCanvas>;

export { handle };
