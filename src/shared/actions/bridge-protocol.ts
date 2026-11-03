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

const BridgeGenericMessageSchema = Schema.Struct({
  ...BridgeEnvelopeFields,
  type: Schema.String,
});

const BridgeMessageSchema = Schema.Union([
  BridgeReadyMessageSchema,
  BridgePaintedMessageSchema,
  BridgeGenericMessageSchema,
]);

type BridgeMessage = typeof BridgeMessageSchema.Type;

export {
  BridgeEnvelopeFields,
  BridgeGenericMessageSchema,
  BridgeMessageSchema,
  BridgePaintedMessageSchema,
  BridgeReadyMessageSchema,
};

export type { BridgeMessage };
