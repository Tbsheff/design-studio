import { Schema } from "effect";

import { extractJson } from "../../../shared/extract-json.js";
import type { JsonValue } from "../../../shared/extract-json.js";
import { toDecoder } from "../../platform/decode/index.js";
import type { FrictionDraft, PageElement, StepChoice } from "./engine/index.js";

const FrictionSchema = Schema.Struct({
  fix: Schema.String,
  severity: Schema.Literals(["high", "medium", "low"]),
  text: Schema.String,
});

const ReplySchema = Schema.Struct({
  action: Schema.Literals(["click", "type", "scroll", "done", "stuck"]),
  elementId: Schema.NullOr(Schema.Int),
  friction: Schema.NullOr(FrictionSchema),
  reason: Schema.String,
  text: Schema.NullOr(Schema.String),
});

const decodeReply = toDecoder(ReplySchema, "ignore");

const MAX_TEXT = 400;

const toJsonOrNull = (text: string): JsonValue | null => {
  try {
    return extractJson(text);
  } catch {
    return null;
  }
};

const toFriction = (
  friction: typeof ReplySchema.Type.friction
): FrictionDraft | null => {
  if (friction === null) {
    return null;
  }

  return {
    fix: friction.fix.slice(0, MAX_TEXT),
    severity: friction.severity,
    text: friction.text.slice(0, MAX_TEXT),
  };
};

const toElementOf = (
  elements: readonly PageElement[],
  elementId: number | null
): PageElement | null =>
  elements.find((element) => element.id === elementId) ?? null;

const toStepChoice = (
  text: string,
  elements: readonly PageElement[]
): StepChoice | null => {
  const decoded = decodeReply(toJsonOrNull(text));

  if (decoded._tag === "Failure") {
    return null;
  }

  const reply = decoded.success;
  const found = toElementOf(elements, reply.elementId);
  const needsElement = reply.action === "click" || reply.action === "type";

  if (needsElement && found === null) {
    return null;
  }

  return {
    action: reply.action,
    element: found,
    friction: toFriction(reply.friction),
    reason: reply.reason.slice(0, MAX_TEXT),
    text: reply.text,
  };
};

export { toStepChoice };
