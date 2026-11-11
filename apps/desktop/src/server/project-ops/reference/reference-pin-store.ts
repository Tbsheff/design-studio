import type { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { Conflict } from "@design-studio/actions/_core/errors/conflict";
import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import { ProjectStore } from "../../store/index.js";
import type { LocalOrgScope } from "../../store/index.js";
import { getSavedPins, toPinPage } from "./reference-pin-file.js";
import type { PinPage } from "./reference-pin-file.js";

interface ListPinCommand {
  readonly cursor: string | null;
  readonly limit: number;
  readonly projectId: string;
}

interface ReferencePinStoreApi {
  readonly list: (
    command: ListPinCommand
  ) => Effect.Effect<PinPage, BadRequest | Conflict | NotFound, LocalOrgScope>;
}

class ReferencePinStore extends Context.Service<
  ReferencePinStore,
  ReferencePinStoreApi
>()("design-studio/project-ops/ReferencePinStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    ReferencePinStore,
    Effect.gen(function* build() {
      const projects = yield* ProjectStore;

      return ReferencePinStore.of({
        list: Effect.fn("ReferencePinStore.list")(function* run(
          command: ListPinCommand
        ) {
          yield* projects.get(command.projectId);
          const pins = yield* getSavedPins(command.projectId);

          return toPinPage(pins, command.cursor, command.limit);
        }),
      });
    })
  );
}

export { ReferencePinStore };

export type { ListPinCommand, PinPage, ReferencePinStoreApi };
