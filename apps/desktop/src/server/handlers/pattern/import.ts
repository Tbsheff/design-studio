import type { Input } from "@design-studio/actions/_core/action";
import type { importPattern } from "@design-studio/actions/pattern/import";
import { Effect } from "effect";

import { PatternUrlWriter } from "../../share/index.js";
import { ProjectStore } from "../../store/index.js";
import type { Handle } from "../_core/handler.js";

type ImportPatternInput = Input<typeof importPattern>;

const handle = Effect.fn("pattern.import")(function* run(
  input: ImportPatternInput
) {
  const projects = yield* ProjectStore;
  const writer = yield* PatternUrlWriter;
  const found = yield* projects.get(input.projectId);

  const pattern = yield* writer.import({
    name: input.name,
    project: found,
    selector: input.selector,
    url: input.url,
    width: input.width,
  });

  return { pattern, referencePath: pattern.referencePath ?? "" };
}) satisfies Handle<typeof importPattern>;

export { handle };
