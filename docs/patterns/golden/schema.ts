import { Schema } from "effect";

import { ProjectIdSchema, PublicationIdSchema } from "../_core/ids.js";

const PublicationSchema = Schema.Struct({
  bytes: Schema.Number,
  id: PublicationIdSchema,
  projectId: ProjectIdSchema,
  title: Schema.String,
  url: Schema.NullOr(Schema.String),
});

type Publication = typeof PublicationSchema.Type;

type PublicationWire = typeof PublicationSchema.Encoded;

export { PublicationSchema };

export type { Publication, PublicationWire };
