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

const BridgeHelloMessageSchema = Schema.Struct({
  docId: Schema.String,
  ns: BridgeNamespaceSchema,
  type: Schema.Literal("bridge-hello"),
});

const BridgeHandshakeMessageSchema = Schema.Struct({
  ns: BridgeNamespaceSchema,
  token: Schema.String,
  type: Schema.Literal("bridge-handshake"),
});

const BridgeMessageSchema = Schema.Union([
  BridgeReadyMessageSchema,
  BridgePaintedMessageSchema,
]);

type BridgeMessage = typeof BridgeMessageSchema.Type;

export {
  BridgeEnvelopeFields,
  BridgeHandshakeMessageSchema,
  BridgeHelloMessageSchema,
  BridgeMessageSchema,
  BridgePaintedMessageSchema,
  BridgeReadyMessageSchema,
};

export type { BridgeMessage };
