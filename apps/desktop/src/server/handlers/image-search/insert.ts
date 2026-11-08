import type { Input } from "@design-studio/actions/_core/action";
import type { insertImageSearch } from "@design-studio/actions/image-search/insert";
import { Effect } from "effect";

import { ImageSearchWriter } from "../../share/index.js";
import type { Handle } from "../_core/handler.js";

type InsertImageSearchInput = Input<typeof insertImageSearch>;

const handle = Effect.fn("image-search.insert")(function* run(
  input: InsertImageSearchInput
) {
  const writer = yield* ImageSearchWriter;
  const { target } = input;

  return yield* writer.insert({
    alt: input.alt,
    directionId: input.directionId,
    fit: input.fit ?? null,
    focal: input.focal ?? null,
    imageId: input.imageId,
    mode: input.mode ?? null,
    position: input.position ?? null,
    projectId: input.projectId,
    target: {
      background: target.background ?? null,
      html: target.html ?? null,
      owners: target.owners ?? null,
      selector: target.selector ?? null,
      source: target.source ?? null,
      tag: target.tag,
    },
  });
}) satisfies Handle<typeof insertImageSearch>;

export { handle };
