import type { Input } from "@design-studio/actions/_core/action";
import type { setLinkInteractionCanvas } from "@design-studio/actions/canvas/set-link-interaction";
import { Effect } from "effect";

import { LinkWriter } from "../../canvas/index.js";
import type { LinkInteractionRequest } from "../../canvas/index.js";
import type { Handle } from "../_core/handler.js";

type SetLinkInteractionCanvasInput = Input<typeof setLinkInteractionCanvas>;

type MotionFields = Pick<
  LinkInteractionRequest,
  | "action"
  | "delayMs"
  | "duration"
  | "easing"
  | "isOutsideClose"
  | "placement"
  | "transition"
  | "trigger"
>;

type VariableFields = Pick<
  LinkInteractionRequest,
  | "isWhenCleared"
  | "variableName"
  | "variableOp"
  | "variableValue"
  | "whenEquals"
  | "whenName"
>;

const toMotionFields = (
  input: SetLinkInteractionCanvasInput
): MotionFields => ({
  action: input.action ?? null,
  delayMs: input.delayMs ?? null,
  duration: input.duration ?? null,
  easing: input.easing ?? null,
  isOutsideClose: input.isOutsideClose ?? null,
  placement: input.placement ?? null,
  transition: input.transition ?? null,
  trigger: input.trigger ?? null,
});

const toVariableFields = (
  input: SetLinkInteractionCanvasInput
): VariableFields => ({
  isWhenCleared: input.whenName === null,
  variableName: input.variableName ?? null,
  variableOp: input.variableOp ?? null,
  variableValue: input.variableValue ?? null,
  whenEquals: input.whenEquals ?? null,
  whenName: input.whenName ?? null,
});

const handle = Effect.fn("canvas.setLinkInteraction")(function* run(
  input: SetLinkInteractionCanvasInput
) {
  const writer = yield* LinkWriter;

  return yield* writer.interact({
    ...toMotionFields(input),
    ...toVariableFields(input),
    fromFrame: input.fromFrame ?? null,
    key: input.key ?? null,
    linkId: input.linkId ?? null,
    projectId: input.projectId,
    selector: input.selector ?? null,
    target: input.target ?? null,
    toFrame: input.toFrame ?? null,
    url: input.url ?? null,
    visibility: input.visibility ?? null,
  });
}) satisfies Handle<typeof setLinkInteractionCanvas>;

export { handle };
