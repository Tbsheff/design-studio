import { Schema } from "effect";

const SafeIdSchema = Schema.String.check(Schema.isPattern(/^[\w-]{1,64}$/u));
const ProjectIdSchema = SafeIdSchema.pipe(Schema.brand("ProjectId"));
const PublicationIdSchema = SafeIdSchema.pipe(Schema.brand("PublicationId"));

type ProjectId = typeof ProjectIdSchema.Type;

type PublicationId = typeof PublicationIdSchema.Type;

export { ProjectIdSchema, PublicationIdSchema, SafeIdSchema };

export type { ProjectId, PublicationId };
