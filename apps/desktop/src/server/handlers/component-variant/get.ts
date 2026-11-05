import type { Input } from "@design-studio/actions/_core/action";
import type { getComponentVariant } from "@design-studio/actions/component-variant/get";
import { Effect } from "effect";

import { ComponentVariantStore } from "../../components/index.js";
import type { Handle } from "../_core/handler.js";

type GetComponentVariantInput = Input<typeof getComponentVariant>;

const handle = Effect.fn("component-variant.get")(function* run(
  input: GetComponentVariantInput
) {
  const store = yield* ComponentVariantStore;

  return yield* store.get({
    className: input.className ?? null,
    directionId: input.directionId,
    file: input.file,
    key: input.key,
    name: input.name,
    projectId: input.projectId,
    value: input.value,
  });
}) satisfies Handle<typeof getComponentVariant>;

export { handle };
