import type { ApprovalCard } from "@design-studio/actions/_core/approval-card";
import type { ShipPlan } from "@design-studio/actions/ship/schema";
import type { ShipPrepare, ShipSettings } from "@design-studio/contracts/ship";
import { Context, Effect, Layer } from "effect";

import { inspectPlan, publishCard, getPrepare } from "../git/ship-plans.js";
import type { PlanQuery, PublishQuery } from "../git/ship-plans.js";
import { getSettings } from "../git/ship-settings.js";
import { attemptShip } from "./ship-core.js";
import type { ShipError } from "./ship-core.js";

interface ShipStoreApi {
  readonly get: (
    projectId: string,
    query: PlanQuery
  ) => Effect.Effect<ShipPrepare, ShipError>;
  readonly inspect: (
    projectId: string,
    query: PlanQuery
  ) => Effect.Effect<ShipPlan, ShipError>;
  readonly publishCard: (
    projectId: string,
    query: PublishQuery
  ) => Effect.Effect<ApprovalCard, ShipError>;
  readonly settings: (
    projectId: string
  ) => Effect.Effect<ShipSettings, ShipError>;
}

class ShipStore extends Context.Service<ShipStore, ShipStoreApi>()(
  "design-studio/ship/ShipStore"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    ShipStore,
    ShipStore.of({
      get: Effect.fn("ShipStore.get")(function* run(
        projectId: string,
        query: PlanQuery
      ) {
        return yield* attemptShip(projectId, (target) =>
          getPrepare(target, query)
        );
      }),
      inspect: Effect.fn("ShipStore.inspect")(function* run(
        projectId: string,
        query: PlanQuery
      ) {
        return yield* attemptShip(projectId, (target) =>
          inspectPlan(target, query)
        );
      }),
      publishCard: Effect.fn("ShipStore.publishCard")(function* run(
        projectId: string,
        query: PublishQuery
      ) {
        return yield* attemptShip(projectId, (target) =>
          publishCard(target, query)
        );
      }),
      settings: Effect.fn("ShipStore.settings")(function* run(
        projectId: string
      ) {
        return yield* attemptShip(projectId, (target) => getSettings(target));
      }),
    })
  );
}

export { ShipStore };

export type { ShipStoreApi };
