import type { LinksFile, PrototypeLink } from "@design-studio/contracts/links";
import { Context, Effect, Layer } from "effect";

import {
  writeCreate,
  writeDelete,
  writeKeep,
  writeStart,
  writeUpdate,
} from "./link-ops.js";
import type {
  LinkCreateQuery,
  LinkKeepQuery,
  LinkSaved,
  LinkUpdateQuery,
} from "./link-ops.js";
import { attemptLink } from "./link-runtime.js";
import type { LinkFailure } from "./link-runtime.js";

interface LinkWriterApi {
  readonly create: (
    query: LinkCreateQuery
  ) => Effect.Effect<LinkSaved, LinkFailure>;
  readonly delete: (
    projectId: string,
    linkId: string
  ) => Effect.Effect<LinkSaved, LinkFailure>;
  readonly keep: (
    query: LinkKeepQuery
  ) => Effect.Effect<
    { kept: readonly PrototypeLink[]; links: LinksFile },
    LinkFailure
  >;
  readonly setStart: (
    projectId: string,
    frame: string
  ) => Effect.Effect<LinksFile, LinkFailure>;
  readonly update: (
    query: LinkUpdateQuery
  ) => Effect.Effect<LinkSaved, LinkFailure>;
}

class LinkWriter extends Context.Service<LinkWriter, LinkWriterApi>()(
  "design-studio/canvas/LinkWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    LinkWriter,
    LinkWriter.of({
      create: Effect.fn("LinkWriter.create")(function* run(
        query: LinkCreateQuery
      ) {
        return yield* attemptLink((runtime) => writeCreate(runtime, query));
      }),
      delete: Effect.fn("LinkWriter.delete")(function* run(
        projectId: string,
        linkId: string
      ) {
        return yield* attemptLink((runtime) =>
          writeDelete(runtime, projectId, linkId)
        );
      }),
      keep: Effect.fn("LinkWriter.keep")(function* run(query: LinkKeepQuery) {
        return yield* attemptLink((runtime) => writeKeep(runtime, query));
      }),
      setStart: Effect.fn("LinkWriter.setStart")(function* run(
        projectId: string,
        frame: string
      ) {
        return yield* attemptLink((runtime) =>
          writeStart(runtime, projectId, frame)
        );
      }),
      update: Effect.fn("LinkWriter.update")(function* run(
        query: LinkUpdateQuery
      ) {
        return yield* attemptLink((runtime) => writeUpdate(runtime, query));
      }),
    })
  );
}

export { LinkWriter };

export type { LinkWriterApi };
