import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import type { CritiqueSchema } from "@design-studio/actions/critique/schema";
import { Effect } from "effect";

import { resolveLayerRefs } from "../page-probe/index.js";
import type { Layer } from "../page-probe/index.js";
import { attemptKnown } from "../platform/attempt/index.js";
import { loadConfig } from "../platform/config/index.js";
import { logInfo } from "../platform/logger/index.js";
import type { PreviewService } from "../preview/index.js";
import type { ViewportRuntime } from "../viewport/index.js";
import { createFrameCapture } from "./critique-capture.js";
import { toDesignMdText } from "./critique-design-md.js";
import { runCritiqueModel } from "./critique-model.js";
import { toCritiqueReply } from "./critique-reply.js";
import { createSavedCritique } from "./critique-saved-write.js";
import { toSavedPath } from "./critique-saved.js";
import { loadTarget } from "./critique-target.js";
import type { FrameTarget } from "./critique-target.js";
import { listTasteLines } from "./critique-taste.js";
import { toCritiqueText, toMockReply } from "./engine/index.js";
import type { CritiqueDraft, PromptLayer } from "./engine/index.js";

type Critique = typeof CritiqueSchema.Type;

interface RunCommand {
  readonly directionId: string;
  readonly frameId: string;
  readonly projectId: string;
}

interface ReplyText {
  readonly costUsd: number;
  readonly model: string;
  readonly text: string;
}

const COST_DIGITS = 4;

const toPromptLayers = (layers: readonly Layer[]): PromptLayer[] =>
  layers.flatMap((layer) => {
    if (layer.hidden) {
      return [];
    }

    return [{ ref: layer.ref, tag: layer.tag, text: layer.text }];
  });

const toSelectors = (
  preview: PreviewService,
  target: FrameTarget,
  refs: readonly string[]
): Promise<ReadonlyMap<string, string>> => {
  if (refs.length === 0) {
    return Promise.resolve(new Map<string, string>());
  }

  return resolveLayerRefs(
    preview,
    target.url,
    { height: target.frame.height, width: target.frame.width },
    target.scope,
    [...refs]
  );
};

const toCritique = (
  frameId: string,
  draft: CritiqueDraft,
  selectors: ReadonlyMap<string, string>
): Critique => ({
  frameId,
  issues: draft.issues.map((issue) => ({
    fix: issue.fix,
    layerId: issue.layerId,
    message: issue.message,
    selector: selectors.get(issue.layerId ?? "") ?? null,
    severity: issue.severity,
  })),
  scores: draft.scores,
});

const askForReply = Effect.fn("askForCritiqueReply")(function* run(
  runtime: ViewportRuntime,
  target: FrameTarget
) {
  const { direction, frame } = target;

  const capture = yield* attemptKnown(() =>
    createFrameCapture(runtime.preview, {
      height: frame.height,
      label: `Frame ${frame.id}`,
      page: frame.path,
      scope: target.scope,
      url: target.url,
      width: frame.width,
    })
  );

  const layers = toPromptLayers(capture.layers);
  const refs = new Set(capture.layers.map((layer) => layer.ref));

  if (loadConfig().agentMode === "mock") {
    const mock: ReplyText = {
      costUsd: 0,
      model: "mock",
      text: toMockReply(layers),
    };

    return { refs, reply: mock };
  }

  const designMd = yield* attemptKnown(() =>
    toDesignMdText(direction.workTree)
  );

  const { height, width } = frame;
  const frameLabel = frame.label ?? `Frame ${frame.id} of ${direction.name}`;
  const tasteRules = yield* attemptKnown(() => listTasteLines());

  const text = toCritiqueText({
    designMd,
    frameLabel,
    height,
    layers,
    tasteRules,
    width,
  });

  const answer = yield* attemptKnown(() =>
    runCritiqueModel(capture.shots, text)
  );

  return { refs, reply: answer };
});

const critiqueFrame = Effect.fn("critiqueFrame")(function* run(
  runtime: ViewportRuntime,
  command: RunCommand
) {
  const target = yield* loadTarget(runtime, command);
  const { refs, reply } = yield* askForReply(runtime, target);
  const parsed = toCritiqueReply(reply.text, refs);

  if (!parsed.isOk) {
    return yield* new BadRequest({
      message: `The critic reply was not valid (${parsed.code}). Run the critique again.`,
    });
  }

  const cited = parsed.value.issues.flatMap((issue) => issue.layerId ?? []);

  const selectors = yield* attemptKnown(() =>
    toSelectors(runtime.preview, target, [...new Set(cited)])
  );

  const result = toCritique(target.frame.id, parsed.value, selectors);
  const key = { ...command, frameId: target.frame.id };

  yield* attemptKnown(() =>
    createSavedCritique(toSavedPath(runtime.dataDir, key), {
      costUsd: reply.costUsd,
      model: reply.model,
      result,
    })
  );

  yield* Effect.sync(() =>
    logInfo(
      `[critique] ${command.projectId}/${command.directionId}/${key.frameId} model ${reply.model} cost $${reply.costUsd.toFixed(COST_DIGITS)}`
    )
  );

  return result;
});

export { critiqueFrame };

export type { Critique, RunCommand };
