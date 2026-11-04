import { Schema } from "effect";

import { toDecoder } from "../platform/decode/index.js";
import { toJsonOrNull } from "./critique-json.js";
import { toCritiqueDraft } from "./engine/index.js";
import type { CritiqueDraft } from "./engine/index.js";

const SeveritySchema = Schema.Literals(["high", "medium", "low"]);

const LayerIdSchema = Schema.optionalKey(Schema.NullOr(Schema.String));

const IssueSchema = Schema.Struct({
  fix: Schema.String,
  layerId: LayerIdSchema,
  message: Schema.String,
  severity: SeveritySchema,
});

const ScoresSchema = Schema.Struct({
  color: Schema.Number,
  copy: Schema.Number,
  hierarchy: Schema.Number,
  spacing: Schema.Number,
  type: Schema.Number,
});

const ModelReplySchema = Schema.Struct({
  issues: Schema.Array(IssueSchema),
  scores: ScoresSchema,
});

type ReplyResult =
  | { readonly code: "bad-json" | "bad-shape"; readonly isOk: false }
  | { readonly isOk: true; readonly value: CritiqueDraft };

const decodeReply = toDecoder(ModelReplySchema, "ignore");

const toCritiqueReply = (
  text: string,
  refs: ReadonlySet<string>
): ReplyResult => {
  const json = toJsonOrNull(text);

  if (json === null) {
    return { code: "bad-json", isOk: false };
  }

  const decoded = decodeReply(json);

  if (decoded._tag === "Failure") {
    return { code: "bad-shape", isOk: false };
  }

  return { isOk: true, value: toCritiqueDraft(decoded.success, refs) };
};

export { toCritiqueReply };

export type { ReplyResult };
