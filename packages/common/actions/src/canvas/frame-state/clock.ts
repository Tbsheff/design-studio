import { MAX_CLOCK_LENGTH } from "@design-studio/contracts/frame-state";
import { Schema } from "effect";

const MIN_CLOCK_LENGTH = 10;

const ClockInputSchema = Schema.NullOr(
  Schema.String.check(
    Schema.isMinLength(MIN_CLOCK_LENGTH),
    Schema.isMaxLength(MAX_CLOCK_LENGTH)
  )
).annotate({
  description:
    "ISO date-time such as 2026-03-03T09:00 that new Date() and Date.now() return in the frame, or null to clear. Dates rendered on the Next server keep the real time and can cause hydration warnings.",
});

const ClockFrozenSchema = Schema.Boolean.annotate({
  description:
    "true stops the clock at the date-time. false lets it tick from there.",
});

const ClockInputFields = {
  clock: Schema.optionalKey(ClockInputSchema),
  isClockFrozen: Schema.optionalKey(ClockFrozenSchema),
};

const ClockDefFields = {
  clock: Schema.optionalKey(Schema.NullOr(Schema.String)),
  isClockFrozen: Schema.optionalKey(Schema.Boolean),
};

export { ClockDefFields, ClockInputFields };
