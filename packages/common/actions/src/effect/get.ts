import { EFFECT_STACK_MAX } from "@design-studio/contracts/layer-effect";
import { Effect, Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ElementSourceFields } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { StyleVariantSchema } from "../_core/style-variant.js";
import { EffectInfoSchema, EffectTargetFields } from "./schema.js";

const LimitRange = Schema.isBetween({ maximum: EFFECT_STACK_MAX, minimum: 1 });

const LimitDefault = Effect.succeed(EFFECT_STACK_MAX);

const LimitSchema = Schema.Int.check(LimitRange).pipe(
  Schema.withDecodingDefaultKey(LimitDefault)
);

const getEffect = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "get_effect",
    set: "core",
    short:
      "Read the effects of one layer: shadows, blur, glass, noise and shaders.",
  },
  confirm: "none",
  description:
    "Read every effect on one layer: its own stack and the named effect style it uses. Read only. Each effect has a kind, an enabled flag and typed values. variant reads the shadows and blurs for one state or breakpoint prefix, such as hover: or data-[state=open]:. The limit caps how many effects return.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/effect",
  },
  id: "effect.get",
  input: Schema.Struct({
    ...EffectTargetFields,
    ...ElementSourceFields,
    limit: LimitSchema,
    variant: StyleVariantSchema,
  }),
  invalidates: [],
  mcp: { name: "get_effect" },
  needs: "project.read",
  output: EffectInfoSchema,
  scope: "project",
});

export { getEffect };
