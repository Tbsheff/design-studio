import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Effect } from "effect";

import { DevServerRunner, DevServerStore } from "../../app/index.js";

const READY_TRIES = 120;
const READY_PAUSE = "1 second";

const toReadyAppUpstream = Effect.fn("RouteSource.toReadyAppUpstream")(
  function* run(projectId: string) {
    const servers = yield* DevServerStore;
    const runner = yield* DevServerRunner;
    const first = yield* servers.status(projectId);

    if (first?.state !== "ready") {
      yield* runner.control(projectId, "start");
    }

    for (let tries = 0; tries < READY_TRIES; tries += 1) {
      const status = yield* servers.status(projectId);

      if (status?.state === "ready" && status.upstream !== null) {
        return status.upstream;
      }

      if (status?.state === "failed") {
        return yield* new BadRequest({
          message: `The app dev server did not start: ${status.message ?? "no message"}. Fix it in the app panel, then try again.`,
        });
      }

      yield* Effect.sleep(READY_PAUSE);
    }

    return yield* new BadRequest({
      message:
        "The app dev server did not get ready in 2 minutes. Start it in the app panel, then try again.",
    });
  }
);

const toAppRouteUrl = (upstream: string, routePath: string): string =>
  new URL(routePath, new URL(upstream).origin).href;

export { toAppRouteUrl, toReadyAppUpstream };
