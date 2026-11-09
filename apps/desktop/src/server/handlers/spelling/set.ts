import type { Input } from "@design-studio/actions/_core/action";
import type { setSpelling } from "@design-studio/actions/spelling/set";
import { Effect } from "effect";

import { SpellingWordWriter } from "../../review/index.js";
import type { Handle } from "../_core/handler.js";

type SetSpellingInput = Input<typeof setSpelling>;

const handle = Effect.fn("spelling.set")(function* run(
  input: SetSpellingInput
) {
  const writer = yield* SpellingWordWriter;
  const words = yield* writer.set(input.projectId, input.words);

  return { words };
}) satisfies Handle<typeof setSpelling>;

export { handle };
