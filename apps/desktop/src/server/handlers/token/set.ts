import type { Input } from "@design-studio/actions/_core/action";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { setToken } from "@design-studio/actions/token/set";
import { Effect } from "effect";

import {
  toMissingTokenText,
  toTokenEntry,
  toTokenReadback,
  toTokenSetChange,
} from "../../design-system/index.js";
import { toRef } from "../../direct-edit/index.js";
import { DirectEditStore, DirectEditWriter } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type SetTokenInput = Input<typeof setToken>;

const handle = Effect.fn("token.set")(function* run(input: SetTokenInput) {
  const store = yield* DirectEditStore;
  const writer = yield* DirectEditWriter;
  const ref = toRef(input);
  const state = yield* store.getDesignSystem(ref);
  const entry = toTokenEntry(state, input.name);

  if (entry === null) {
    return yield* new NotFound({
      message: toMissingTokenText(state, input.name),
    });
  }

  const result = yield* writer.updateTokens(ref, {
    changes: [toTokenSetChange(entry, input.theme, input.value)],
  });

  const after =
    result.state.entries.find((item) => item.path === entry.path) ?? entry;

  return {
    changedFiles: result.version.changedFiles,
    theme: input.theme,
    token: entry.cssVar,
    versionId: result.version.id,
    ...toTokenReadback(after, input.theme),
  };
}) satisfies Handle<typeof setToken>;

export { handle };
