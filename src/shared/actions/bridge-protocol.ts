import { Schema } from "effect";

const BridgeNamespaceSchema = Schema.Literal("studio");

const BridgeEnvelopeFields = {
  ns: BridgeNamespaceSchema,
  token: Schema.String,
} as const;

const BridgeReadyMessageSchema = Schema.Struct({
  ...BridgeEnvelopeFields,
  redirectedFrom: Schema.optional(Schema.String),
  type: Schema.Literal("ready"),
  url: Schema.String,
});

const BridgePaintedMessageSchema = Schema.Struct({
  ...BridgeEnvelopeFields,
  at: Schema.Number,
  type: Schema.Literal("painted"),
});

const BridgeMessageSchema = Schema.Union([
  BridgeReadyMessageSchema,
  BridgePaintedMessageSchema,
]);

type BridgeMessage = typeof BridgeMessageSchema.Type;

export {
  BridgeEnvelopeFields,
  BridgeMessageSchema,
  BridgePaintedMessageSchema,
  BridgeReadyMessageSchema,
};

export type { BridgeMessage };
