import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import { attemptProject } from "./project-runtime.js";
import type { StudioProjectStore } from "./project-types.js";

interface EncodedUpload {
  readonly data: string;
  readonly mime: string;
  readonly name: string;
}

interface ProjectWriterApi {
  readonly create: (
    ...args: Parameters<StudioProjectStore["create"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["create"]>>,
    KnownFailure
  >;
  readonly createInFolder: (
    ...args: Parameters<StudioProjectStore["createInFolder"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["createInFolder"]>>,
    KnownFailure
  >;
  readonly importFolder: (
    ...args: Parameters<StudioProjectStore["importFolder"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["importFolder"]>>,
    KnownFailure
  >;
  readonly attachApp: (
    ...args: Parameters<StudioProjectStore["attachApp"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["attachApp"]>>,
    KnownFailure
  >;
  readonly discardCreated: (
    ...args: Parameters<StudioProjectStore["discardCreated"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["discardCreated"]>>,
    KnownFailure
  >;
  readonly moveIntoFolder: (
    ...args: Parameters<StudioProjectStore["moveIntoFolder"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["moveIntoFolder"]>>,
    KnownFailure
  >;
  readonly rename: (
    ...args: Parameters<StudioProjectStore["rename"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["rename"]>>,
    KnownFailure
  >;
  readonly save: (
    ...args: Parameters<StudioProjectStore["save"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["save"]>>,
    KnownFailure
  >;
  readonly addDirection: (
    ...args: Parameters<StudioProjectStore["addDirection"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["addDirection"]>>,
    KnownFailure
  >;
  readonly updateDirection: (
    ...args: Parameters<StudioProjectStore["updateDirection"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["updateDirection"]>>,
    KnownFailure
  >;
  readonly updateSettings: (
    ...args: Parameters<StudioProjectStore["updateSettings"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["updateSettings"]>>,
    KnownFailure
  >;
  readonly setThumbnail: (
    ...args: Parameters<StudioProjectStore["setThumbnail"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["setThumbnail"]>>,
    KnownFailure
  >;
  readonly setPackId: (
    ...args: Parameters<StudioProjectStore["setPackId"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["setPackId"]>>,
    KnownFailure
  >;
  readonly markDesignSystemDeleted: (
    ...args: Parameters<StudioProjectStore["markDesignSystemDeleted"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["markDesignSystemDeleted"]>>,
    KnownFailure
  >;
  readonly saveAttachment: (
    ...args: Parameters<StudioProjectStore["saveAttachment"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["saveAttachment"]>>,
    KnownFailure
  >;
  readonly saveEncodedAttachment: (
    projectId: string,
    upload: EncodedUpload
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["saveAttachment"]>>,
    KnownFailure
  >;
  readonly writeDesignMd: (
    ...args: Parameters<StudioProjectStore["writeDesignMd"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["writeDesignMd"]>>,
    KnownFailure
  >;
  readonly reserveFolder: (
    ...args: Parameters<StudioProjectStore["reserveFolder"]>
  ) => Effect.Effect<
    Awaited<ReturnType<StudioProjectStore["reserveFolder"]>>,
    KnownFailure
  >;
}

class ProjectWriter extends Context.Service<ProjectWriter, ProjectWriterApi>()(
  "design-studio/store/ProjectWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ProjectWriter,
    ProjectWriter.of({
      addDirection: Effect.fn("ProjectWriter.addDirection")(function* run(
        ...args: Parameters<StudioProjectStore["addDirection"]>
      ) {
        return yield* attemptProject((store) => store.addDirection(...args));
      }),
      attachApp: Effect.fn("ProjectWriter.attachApp")(function* run(
        ...args: Parameters<StudioProjectStore["attachApp"]>
      ) {
        return yield* attemptProject((store) => store.attachApp(...args));
      }),
      create: Effect.fn("ProjectWriter.create")(function* run(
        ...args: Parameters<StudioProjectStore["create"]>
      ) {
        return yield* attemptProject((store) => store.create(...args));
      }),
      createInFolder: Effect.fn("ProjectWriter.createInFolder")(function* run(
        ...args: Parameters<StudioProjectStore["createInFolder"]>
      ) {
        return yield* attemptProject((store) => store.createInFolder(...args));
      }),
      discardCreated: Effect.fn("ProjectWriter.discardCreated")(function* run(
        ...args: Parameters<StudioProjectStore["discardCreated"]>
      ) {
        return yield* attemptProject((store) => store.discardCreated(...args));
      }),
      importFolder: Effect.fn("ProjectWriter.importFolder")(function* run(
        ...args: Parameters<StudioProjectStore["importFolder"]>
      ) {
        return yield* attemptProject((store) => store.importFolder(...args));
      }),
      markDesignSystemDeleted: Effect.fn(
        "ProjectWriter.markDesignSystemDeleted"
      )(function* run(
        ...args: Parameters<StudioProjectStore["markDesignSystemDeleted"]>
      ) {
        return yield* attemptProject((store) =>
          store.markDesignSystemDeleted(...args)
        );
      }),
      moveIntoFolder: Effect.fn("ProjectWriter.moveIntoFolder")(function* run(
        ...args: Parameters<StudioProjectStore["moveIntoFolder"]>
      ) {
        return yield* attemptProject((store) => store.moveIntoFolder(...args));
      }),
      rename: Effect.fn("ProjectWriter.rename")(function* run(
        ...args: Parameters<StudioProjectStore["rename"]>
      ) {
        return yield* attemptProject((store) => store.rename(...args));
      }),
      reserveFolder: Effect.fn("ProjectWriter.reserveFolder")(function* run(
        ...args: Parameters<StudioProjectStore["reserveFolder"]>
      ) {
        return yield* attemptProject((store) => store.reserveFolder(...args));
      }),
      save: Effect.fn("ProjectWriter.save")(function* run(
        ...args: Parameters<StudioProjectStore["save"]>
      ) {
        return yield* attemptProject((store) => store.save(...args));
      }),
      saveAttachment: Effect.fn("ProjectWriter.saveAttachment")(function* run(
        ...args: Parameters<StudioProjectStore["saveAttachment"]>
      ) {
        return yield* attemptProject((store) => store.saveAttachment(...args));
      }),
      saveEncodedAttachment: Effect.fn("ProjectWriter.saveEncodedAttachment")(
        function* run(projectId: string, upload: EncodedUpload) {
          const bytes = new Uint8Array(Buffer.from(upload.data, "base64"));

          return yield* attemptProject((store) =>
            store.saveAttachment(projectId, {
              bytes,
              mime: upload.mime,
              name: upload.name,
            })
          );
        }
      ),
      setPackId: Effect.fn("ProjectWriter.setPackId")(function* run(
        ...args: Parameters<StudioProjectStore["setPackId"]>
      ) {
        return yield* attemptProject((store) => store.setPackId(...args));
      }),
      setThumbnail: Effect.fn("ProjectWriter.setThumbnail")(function* run(
        ...args: Parameters<StudioProjectStore["setThumbnail"]>
      ) {
        return yield* attemptProject((store) => store.setThumbnail(...args));
      }),
      updateDirection: Effect.fn("ProjectWriter.updateDirection")(function* run(
        ...args: Parameters<StudioProjectStore["updateDirection"]>
      ) {
        return yield* attemptProject((store) => store.updateDirection(...args));
      }),
      updateSettings: Effect.fn("ProjectWriter.updateSettings")(function* run(
        ...args: Parameters<StudioProjectStore["updateSettings"]>
      ) {
        return yield* attemptProject((store) => store.updateSettings(...args));
      }),
      writeDesignMd: Effect.fn("ProjectWriter.writeDesignMd")(function* run(
        ...args: Parameters<StudioProjectStore["writeDesignMd"]>
      ) {
        return yield* attemptProject((store) => store.writeDesignMd(...args));
      }),
    })
  );
}

export { ProjectWriter };

export type { EncodedUpload, ProjectWriterApi };
