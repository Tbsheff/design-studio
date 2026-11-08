import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer } from "effect";

import { createBoundedCache } from "../../platform/cache/index.js";
import {
  toDataModelDetail,
  toDataModelPage,
  toFoundModel,
  toModelNames,
} from "./data-model-view.js";
import type {
  DataModelDetail,
  DataModelPage,
  GetDataModelCommand,
  ListDataModelCommand,
} from "./data-model-view.js";
import { toPrismaModels } from "./engine/index.js";
import type { PrismaModel } from "./engine/index.js";
import { toSchemaKey, toSchemaSources } from "./schema-files.js";

interface DataModelStoreApi {
  readonly get: (
    command: GetDataModelCommand
  ) => Effect.Effect<DataModelDetail, BadRequest | NotFound>;
  readonly list: (
    command: ListDataModelCommand
  ) => Effect.Effect<DataModelPage, NotFound>;
}

const CACHE_MAX = 8;

const NO_SCHEMA =
  "This app has no Prisma schema. Add prisma/schema.prisma, or set schema in prisma.config.ts.";

class DataModelStore extends Context.Service<
  DataModelStore,
  DataModelStoreApi
>()("design-studio/app/DataModelStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.sync(DataModelStore, () => {
    const cache = createBoundedCache<string, readonly PrismaModel[]>(CACHE_MAX);

    const readModels = Effect.fn("DataModelStore.readModels")(function* run(
      appRoot: string
    ) {
      const key = yield* Effect.promise(() => toSchemaKey(appRoot));

      if (key === null) {
        return yield* new NotFound({ message: NO_SCHEMA });
      }

      const cached = cache.get(key);

      if (cached !== null) {
        return cached;
      }

      const sources = yield* Effect.promise(() => toSchemaSources(appRoot));
      const parsed = toPrismaModels(sources ?? []);

      if (!parsed.ok) {
        return yield* new NotFound({ message: NO_SCHEMA });
      }

      cache.set(key, parsed.value);

      return parsed.value;
    });

    return DataModelStore.of({
      get: Effect.fn("DataModelStore.get")(function* run(
        command: GetDataModelCommand
      ) {
        const models = yield* readModels(command.appRoot);
        const found = toFoundModel(models, command.model);

        if (found === null) {
          return yield* new NotFound({
            message: `No model or enum has the name ${command.model}. Call list_data_model to see the names. Some models: ${toModelNames(models)}.`,
          });
        }

        const detail = toDataModelDetail(models, found, command);

        if (detail === null) {
          return yield* new BadRequest({
            message: `Cannot make rows for ${found.name}.`,
          });
        }

        return detail;
      }),
      list: Effect.fn("DataModelStore.list")(function* run(
        command: ListDataModelCommand
      ) {
        const models = yield* readModels(command.appRoot);

        return toDataModelPage(models, command);
      }),
    });
  });
}

export { DataModelStore };

export type { DataModelStoreApi };
