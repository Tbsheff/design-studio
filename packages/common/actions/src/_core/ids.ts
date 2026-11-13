import { Schema } from "effect";

const SafeIdSchema = Schema.String.check(Schema.isPattern(/^[\w-]{1,64}$/u));
const ProjectIdSchema = SafeIdSchema.pipe(Schema.brand("ProjectId"));
const PublicationIdSchema = SafeIdSchema.pipe(Schema.brand("PublicationId"));
const DirectionIdSchema = SafeIdSchema.pipe(Schema.brand("DirectionId"));
const VersionIdSchema = SafeIdSchema.pipe(Schema.brand("VersionId"));
const RunIdSchema = SafeIdSchema.pipe(Schema.brand("RunId"));
const FrameIdSchema = SafeIdSchema.pipe(Schema.brand("FrameId"));
const CommentIdSchema = SafeIdSchema.pipe(Schema.brand("CommentId"));
const PackIdSchema = SafeIdSchema.pipe(Schema.brand("PackId"));

const StateSequenceIdSchema = SafeIdSchema.pipe(
  Schema.brand("StateSequenceId")
);

type ProjectId = typeof ProjectIdSchema.Type;

type PublicationId = typeof PublicationIdSchema.Type;

type DirectionId = typeof DirectionIdSchema.Type;

type VersionId = typeof VersionIdSchema.Type;

type RunId = typeof RunIdSchema.Type;

type FrameId = typeof FrameIdSchema.Type;

type CommentId = typeof CommentIdSchema.Type;

type PackId = typeof PackIdSchema.Type;

type StateSequenceId = typeof StateSequenceIdSchema.Type;

export {
  CommentIdSchema,
  DirectionIdSchema,
  FrameIdSchema,
  PackIdSchema,
  ProjectIdSchema,
  PublicationIdSchema,
  RunIdSchema,
  SafeIdSchema,
  StateSequenceIdSchema,
  VersionIdSchema,
};

export type {
  CommentId,
  DirectionId,
  FrameId,
  PackId,
  ProjectId,
  PublicationId,
  RunId,
  StateSequenceId,
  VersionId,
};
