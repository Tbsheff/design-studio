import type { Input } from "@design-studio/actions/_core/action";
import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { importTheme } from "@design-studio/actions/theme/import";
import { Effect } from "effect";

import { PageStyleRunner } from "../../share/index.js";
import { ThemeWriter } from "../../style-scope/index.js";
import type { Handle } from "../_core/handler.js";

type ImportThemeInput = Input<typeof importTheme>;

const SOURCE_RULE =
  "Give exactly one of url and imagePath. Leave the other one null.";

const handle = Effect.fn("theme.import")(function* run(
  input: ImportThemeInput
) {
  const { url } = input;

  if ((url === null) === (input.imagePath === null)) {
    return yield* new BadRequest({ message: SOURCE_RULE });
  }

  const writer = yield* ThemeWriter;
  let found = null;

  if (url !== null) {
    const runner = yield* PageStyleRunner;

    found = yield* runner.sample({ url });
  }

  return yield* writer.import({
    directionId: input.directionId,
    imagePath: input.imagePath,
    name: input.name,
    projectId: input.projectId,
    sample: found,
    url: input.url,
  });
}) satisfies Handle<typeof importTheme>;

export { handle };
