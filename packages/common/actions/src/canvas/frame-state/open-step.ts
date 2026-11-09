import {
  MAX_OPEN_STEPS,
  MAX_STEP_SELECTOR,
  OPEN_STEP_KINDS,
} from "@design-studio/contracts/frame-state";
import { Schema } from "effect";

const OpenStepKindSchema = Schema.Literals(OPEN_STEP_KINDS).annotate({
  description: "click, hover or focus the element.",
});

const SelectorLength = Schema.isMaxLength(MAX_STEP_SELECTOR);

const SelectorSchema = Schema.String.check(
  Schema.isMinLength(1),
  SelectorLength
);

const OpenStepSchema = Schema.Struct({
  kind: OpenStepKindSchema,
  selector: SelectorSchema.annotate({
    description:
      "CSS selector of the trigger, such as a Radix dialog trigger button.",
  }),
});

const OpenStepCount = Schema.isMaxLength(MAX_OPEN_STEPS);

const OpenStepsSchema = Schema.Array(OpenStepSchema).check(OpenStepCount);

export { OpenStepsSchema };
