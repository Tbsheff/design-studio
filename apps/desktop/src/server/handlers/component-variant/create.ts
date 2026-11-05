import type { Input } from "@design-studio/actions/_core/action";
import type { createComponentVariant } from "@design-studio/actions/component-variant/create";
import { Effect } from "effect";

import { ComponentVariantWriter } from "../../components/index.js";
import type { Handle } from "../_core/handler.js";

type CreateComponentVariantInput = Input<typeof createComponentVariant>;

const handle = Effect.fn("component-variant.create")(function* run(
  input: CreateComponentVariantInput
) {
  const writer = yield* ComponentVariantWriter;

  return yield* writer.write({
    change: {
      classes: input.classes ?? null,
      copyFrom: input.copyFrom ?? null,
      key: input.key,
      kind: "create",
      newKey: input.newKey,
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
}) satisfies Handle<typeof createComponentVariant>;

export { handle };
