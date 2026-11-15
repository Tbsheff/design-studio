import type { Input } from "@design-studio/actions/_core/action";
import type { createShare } from "@design-studio/actions/share/create";
import type {
  ShareFrameUrl,
  ShareMade,
} from "@design-studio/actions/share/schema";
import {
  toShareFrameHashUrl,
  toShareFrameKey,
} from "@design-studio/contracts/share";
import { Effect } from "effect";

import { LinkedShareWriter, ShareStore } from "../../share/index.js";
import type { Handle, Preview } from "../_core/handler.js";

type CreateShareInput = Input<typeof createShare>;

const toFrameUrls = (made: ShareMade): ShareFrameUrl[] =>
  made.link.frames.map((frame, index) => {
    const frameKey = toShareFrameKey(frame, index);
    let url: string | null = null;

    if (made.url !== null) {
      url = toShareFrameHashUrl(made.url, frameKey);
    }

    const { name } = frame;

    return { frameKey, name, url };
  });

const handle = Effect.fn("share.create")(function* run(
  input: CreateShareInput
) {
  const writer = yield* LinkedShareWriter;
  const made = yield* writer.create(input);

  return { ...made, frameUrls: toFrameUrls(made) };
}) satisfies Handle<typeof createShare>;

const preview = Effect.fn("share.create.preview")(function* card(
  input: CreateShareInput
) {
  const store = yield* ShareStore;

  return yield* store.createCard(input);
}) satisfies Preview<typeof createShare>;

export { handle, preview };
