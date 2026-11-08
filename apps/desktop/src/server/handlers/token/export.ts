import type { Input } from "@design-studio/actions/_core/action";
import type { exportToken } from "@design-studio/actions/token/export";
import { Effect } from "effect";

import { toTokenExport } from "../../design-system/index.js";
import { McpReadStore } from "../../preview/index.js";
import type { Handle } from "../_core/handler.js";

type ExportTokenInput = Input<typeof exportToken>;

const handle = Effect.fn("token.export")(function* run(
  input: ExportTokenInput
) {
  const store = yield* McpReadStore;

  const view = yield* store.tokens({
    directionId: input.directionId,
    projectId: input.projectId,
    versionId: null,
  });

  return toTokenExport(view.tokens, {
    format: input.format,
    groups: input.groups,
    modes: input.modes,
  });
}) satisfies Handle<typeof exportToken>;

export { handle };
