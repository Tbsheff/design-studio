import { Schema } from "effect";

const toTrimmed = (min: number, max: number): typeof Schema.Trim =>
  Schema.Trim.check(Schema.isMinLength(min), Schema.isMaxLength(max));

const toBounded = (max: number): typeof Schema.String =>
  Schema.String.check(Schema.isMaxLength(max));

export { toBounded, toTrimmed };
