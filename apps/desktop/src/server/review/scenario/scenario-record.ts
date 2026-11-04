import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { withFrameStateHost } from "@design-studio/contracts/frame-state";
import { Effect } from "effect";

import { startTrial, stopTrial } from "../../app/index.js";
import type { RecordedResponse } from "../../app/index.js";
import { attemptKnown } from "../../platform/attempt/index.js";
import type { ViewportRuntime } from "../../viewport/index.js";
import type { ObservedCall } from "./engine/index.js";
import { toObservedCalls } from "./scenario-observe.js";
import type { ScenarioTarget } from "./scenario-target.js";

const SETTLE_EXPRESSION =
  "(async () => { window.scrollTo(0, document.body.scrollHeight); await new Promise((done) => setTimeout(done, 2500)); window.scrollTo(0, 0); await new Promise((done) => setTimeout(done, 500)); return true; })()";

const recordFrame = Effect.fn("recordFrame")(function* run(
  runtime: ViewportRuntime,
  target: ScenarioTarget
) {
  const withPage = runtime.preview.withPage?.bind(runtime.preview) ?? null;

  if (withPage === null) {
    return yield* new BadRequest({
      message: "Rendering is not available, so calls cannot be recorded.",
    });
  }

  const observed: ObservedCall[] = [];

  const recorder = (response: RecordedResponse): void => {
    observed.push(...toObservedCalls(response));
  };

  const trialId = startTrial(target.projectDir, { mocks: [], recorder });
  const url = withFrameStateHost(target.url, trialId);

  if (url === target.url) {
    stopTrial(target.projectDir, trialId);

    return yield* new BadRequest({
      message:
        "This frame is not served by the studio proxy, so its calls cannot be recorded.",
    });
  }

  const viewport = { height: target.frame.height, width: target.frame.width };

  yield* attemptKnown(() =>
    withPage(url, viewport, (page) => page.evaluate(SETTLE_EXPRESSION))
  ).pipe(
    Effect.ensuring(Effect.sync(() => stopTrial(target.projectDir, trialId)))
  );

  return observed;
});

export { recordFrame };
