import { Context, Effect, Layer } from "effect";

import { readRoutes, readView } from "./dev-server-ops.js";
import { attemptServer } from "./dev-server-runner.js";
import type { DevServerFailure } from "./dev-server-runner.js";

interface DevServerStoreApi {
  readonly routes: (
    projectId: string
  ) => Effect.Effect<Awaited<ReturnType<typeof readRoutes>>, DevServerFailure>;
  readonly view: (
    projectId: string
  ) => Effect.Effect<Awaited<ReturnType<typeof readView>>, DevServerFailure>;
}

class DevServerStore extends Context.Service<
  DevServerStore,
  DevServerStoreApi
>()("design-studio/app/DevServerStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    DevServerStore,
    DevServerStore.of({
      routes: Effect.fn("DevServerStore.routes")(function* run(
        projectId: string
      ) {
        return yield* attemptServer((runtime) =>
          readRoutes(runtime, projectId)
        );
      }),
      view: Effect.fn("DevServerStore.view")(function* run(projectId: string) {
        return yield* attemptServer((runtime) => readView(runtime, projectId));
      }),
    })
  );
}

export { DevServerStore };
