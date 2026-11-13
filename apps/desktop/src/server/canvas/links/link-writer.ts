import type { LinksFile, PrototypeLink } from "@design-studio/contracts/links";
import type { StartPoint } from "@design-studio/contracts/start-points";
import { Context, Effect, Layer } from "effect";

import {
  writeCreate,
  writeDelete,
  setInteraction,
  writeKeep,
  writeUpdate,
} from "./link-ops.js";
import type {
  LinkCreateQuery,
  LinkInteractionSetQuery,
  LinkKeepQuery,
  LinkSaved,
  LinkUpdateQuery,
} from "./link-ops.js";
import { attemptLink } from "./link-runtime.js";
import type { LinkFailure } from "./link-runtime.js";
import { setFirstStart, setStartList } from "./start-points.js";
import type { StartPointsQuery } from "./start-points.js";

interface LinkWriterApi {
  readonly create: (
    query: LinkCreateQuery
  ) => Effect.Effect<LinkSaved, LinkFailure>;
  readonly delete: (
    projectId: string,
    linkId: string
  ) => Effect.Effect<LinkSaved, LinkFailure>;
  readonly interact: (
    query: LinkInteractionSetQuery
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
  readonly setStartPoints: (
    query: StartPointsQuery
  ) => Effect.Effect<readonly StartPoint[], LinkFailure>;
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
      interact: Effect.fn("LinkWriter.interact")(function* run(
        query: LinkInteractionSetQuery
      ) {
        return yield* attemptLink((runtime) => setInteraction(runtime, query));
      }),
      keep: Effect.fn("LinkWriter.keep")(function* run(query: LinkKeepQuery) {
        return yield* attemptLink((runtime) => writeKeep(runtime, query));
      }),
      setStart: Effect.fn("LinkWriter.setStart")(function* run(
        projectId: string,
        frame: string
      ) {
        return yield* attemptLink((runtime) =>
          setFirstStart(runtime, projectId, frame)
        );
      }),
      setStartPoints: Effect.fn("LinkWriter.setStartPoints")(function* run(
        query: StartPointsQuery
      ) {
        return yield* attemptLink((runtime) => setStartList(runtime, query));
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
