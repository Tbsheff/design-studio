import { VARIATION_BRIEF_MAX } from "@design-studio/contracts";
import { Schema } from "effect";

import { toDecoder } from "../platform/decode/index.js";

const TITLE_MAX = 40;
const BRIEF_MIN = 12;

const BriefItemSchema = Schema.Struct({
  brief: Schema.Trim.check(
    Schema.isMinLength(BRIEF_MIN),
    Schema.isMaxLength(VARIATION_BRIEF_MAX)
  ),
  title: Schema.Trim.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(TITLE_MAX)
  ),
});

const BriefListSchema = Schema.Array(BriefItemSchema);

const BriefReplySchema = Schema.Union([
  BriefListSchema,
  Schema.Struct({ briefs: BriefListSchema }),
]);

type BriefItem = typeof BriefItemSchema.Type;

type BriefReply = typeof BriefReplySchema.Type;

const decodeBriefItem = toDecoder(BriefItemSchema, "ignore");
const decodeBriefReply = toDecoder(BriefReplySchema, "ignore");

const toBriefItems = (reply: BriefReply): readonly BriefItem[] => {
  if ("briefs" in reply) {
    return reply.briefs;
  }

  return reply;
};

export { TITLE_MAX, decodeBriefItem, decodeBriefReply, toBriefItems };

export type { BriefItem };
