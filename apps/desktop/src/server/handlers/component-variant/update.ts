import type { Input } from "@design-studio/actions/_core/action";
import type { updateComponentVariant } from "@design-studio/actions/component-variant/update";
import { Effect } from "effect";

import { ComponentVariantWriter } from "../../components/index.js";
import type { Handle } from "../_core/handler.js";

type UpdateComponentVariantInput = Input<typeof updateComponentVariant>;

const handle = Effect.fn("component-variant.update")(function* run(
  input: UpdateComponentVariantInput
) {
  const writer = yield* ComponentVariantWriter;

  return yield* writer.write({
    change: {
      classes: input.classes ?? null,
      key: input.key,
      kind: "update",
      rename: input.rename ?? null,
      setDefault: input.setDefault,
      value: input.value,
    },
    directionId: input.directionId,
    projectId: input.projectId,
    target: {
      cva: input.cva ?? null,
      file: input.file ?? null,
      name: input.name ?? null,
    },
  });
}) satisfies Handle<typeof updateComponentVariant>;

export { handle };
