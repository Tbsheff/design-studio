import type { Input } from "@design-studio/actions/_core/action";
import type { applyImplicitLinkCanvas } from "@design-studio/actions/canvas/apply-implicit-link";
import { Effect } from "effect";

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
