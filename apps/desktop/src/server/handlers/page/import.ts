import type { Input } from "@design-studio/actions/_core/action";
import type { importPage } from "@design-studio/actions/page/import";
import { Effect } from "effect";

import { PageWriter } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type ImportPageInput = Input<typeof importPage>;

const handle = Effect.fn("page.import")(function* run(input: ImportPageInput) {
  const writer = yield* PageWriter;

  return yield* writer.import({
    appRoute: null,
    directionId: input.directionId,
    name: input.name,
    projectId: input.projectId,
    selector: input.selector,
    url: input.url,
    width: input.width,
  });
}) satisfies Handle<typeof importPage>;

export { handle };
