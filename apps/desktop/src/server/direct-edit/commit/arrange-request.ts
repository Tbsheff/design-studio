import { Schema } from "effect";

import { ALIGN_OPS, DISTRIBUTE_OPS } from "../../../shared/arrange.js";
import { toDecoder } from "../../platform/decode/index.js";
import { toIssueText, toTrimmed } from "../request/request-fields.js";
import type { FailedDecode } from "../request/request-fields.js";

const ARRANGE_TARGETS_MAX = 50;
const PATH_MAX = 300;
const SELECTOR_MAX = 2000;
const VIEWPORT_MIN = 100;
const VIEWPORT_WIDTH_MAX = 10_000;
const VIEWPORT_HEIGHT_MAX = 20_000;

const ViewportSchema = Schema.Struct({
  height: Schema.Int.check(
    Schema.isBetween({ maximum: VIEWPORT_HEIGHT_MAX, minimum: VIEWPORT_MIN })
  ),
  width: Schema.Int.check(
    Schema.isBetween({ maximum: VIEWPORT_WIDTH_MAX, minimum: VIEWPORT_MIN })
  ),
});

const ActionSchema = Schema.Union([
  Schema.Struct({ align: Schema.Literals(ALIGN_OPS) }),
  Schema.Struct({ distribute: Schema.Literals(DISTRIBUTE_OPS) }),
  Schema.Struct({ tidy: Schema.Literal(true) }),
]);

const TargetsSchema = Schema.Array(
  Schema.Struct({ selector: toTrimmed(1, SELECTOR_MAX) })
).check(Schema.isMinLength(1), Schema.isMaxLength(ARRANGE_TARGETS_MAX));

const RequestSchema = Schema.Struct({
  action: ActionSchema,
  path: Schema.optional(toTrimmed(0, PATH_MAX)),
  targets: TargetsSchema,
  viewport: Schema.optional(ViewportSchema),
});

const decodeArrangeRequest = toDecoder(RequestSchema, "error");

const toArrangeIssue = (failure: FailedDecode): string =>
  toIssueText(failure, "arrange is not valid");

export { ARRANGE_TARGETS_MAX, decodeArrangeRequest, toArrangeIssue };
