import type { Input } from "@design-studio/actions/_core/action";
import type { importComponent } from "@design-studio/actions/component/import";
import { Effect } from "effect";

import { RegistryWriter } from "../../components/index.js";
import type { Handle } from "../_core/handler.js";

type ImportComponentInput = Input<typeof importComponent>;

const handle = Effect.fn("component.import")(function* run(
  input: ImportComponentInput
) {
  const writer = yield* RegistryWriter;

  return yield* writer.import({
    directionId: input.directionId,
    name: input.name,
    projectId: input.projectId,
    registryUrl: input.registryUrl,
  });
}) satisfies Handle<typeof importComponent>;

export { handle };
