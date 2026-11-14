import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ElementTargetSchema } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { StyleVariantSchema } from "../_core/style-variant.js";
import {
  EffectChangeSchema,
  EffectSetFields,
  EffectTargetFields,
} from "./schema.js";

const setEffect = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_effect",
    set: "core",
    short:
      "Set the effect stack of one layer: shadows, blur, glass, noise and shaders.",
  },
  confirm: "none",
  description:
    "Set the effects of one layer in one version. effects is the full ordered stack: drop-shadow, inner-shadow, layer-blur, background-blur, noise, glass and shader, each with an enabled flag. A shadow size such as md writes the scale name shadow-md and ignores the numbers; null writes the numbers. styleName applies a saved effect style, null removes it. A shader also writes a WebGL script. variant is a state or breakpoint prefix such as hover:, md: or data-[state=open]:, and the default is the base style. A variant takes shadows and blurs only. Saves one version.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/effect",
  },
  id: "effect.set",
  input: Schema.Struct({
    ...EffectTargetFields,
    ...EffectSetFields,
    target: ElementTargetSchema,
    variant: StyleVariantSchema,
  }),
  invalidates: ["effect.get", "effect.list"],
  mcp: { name: "set_effect" },
  needs: "project.update",
  output: EffectChangeSchema,
  scope: "project",
});

export { setEffect };
