import type { ShipResult, ShipSettings } from "@design-studio/contracts/ship";
import { Context, Effect, Layer } from "effect";

import { attemptShip } from "./ship-core.js";
import type { ShipError } from "./ship-core.js";
import { publishPlan } from "./ship-plans.js";
import type { PublishQuery } from "./ship-plans.js";
import { writeSettings } from "./ship-settings.js";

interface ShipRunnerApi {
  readonly publish: (
    projectId: string,
    query: PublishQuery
  ) => Effect.Effect<ShipResult, ShipError>;
  readonly setSettings: (
    projectId: string,
    settings: ShipSettings
  ) => Effect.Effect<ShipSettings, ShipError>;
}

class ShipRunner extends Context.Service<ShipRunner, ShipRunnerApi>()(
  "design-studio/ship/ShipRunner"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    ShipRunner,
    ShipRunner.of({
      publish: Effect.fn("ShipRunner.publish")(function* run(
        projectId: string,
        query: PublishQuery
      ) {
        return yield* attemptShip(projectId, (target) =>
          publishPlan(target, query)
        );
      }),
      setSettings: Effect.fn("ShipRunner.setSettings")(function* run(
        projectId: string,
        settings: ShipSettings
      ) {
        return yield* attemptShip(projectId, (target) =>
          writeSettings(target, settings)
        );
      }),
    })
  );
}

export { ShipRunner };

export type { ShipRunnerApi };
