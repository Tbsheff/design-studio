import type { Input } from "@design-studio/actions/_core/action";
import type { setProp } from "@design-studio/actions/prop/set";
import { Effect } from "effect";

import { toFields, toRef } from "../../direct-edit/index.js";
import { DirectEditWriter } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type SetPropInput = Input<typeof setProp>;

const handle = Effect.fn("prop.set")(function* run(input: SetPropInput) {
  const service = yield* DirectEditWriter;

  return yield* service.setProps(toRef(input), toFields(input));
}) satisfies Handle<typeof setProp>;

export { handle };
