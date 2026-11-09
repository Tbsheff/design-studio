import { Schema } from "effect";

import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";

const GLOBS_MAX = 100;
const GLOB_MAX = 300;
const GLOB_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))\S.*$/u;

const FileLockGlobSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(GLOB_MAX),
  Schema.isPattern(GLOB_PATTERN)
);

const FileLockGlobsSchema = Schema.Array(FileLockGlobSchema).check(
  Schema.isMaxLength(GLOBS_MAX)
);

const FileLockTargetFields = {
  directionId: DirectionIdSchema,
  projectId: ProjectIdSchema,
} as const;

const FileLockViewSchema = Schema.Struct({
  directionId: Schema.String,
  globs: FileLockGlobsSchema,
});

const FileLockPageSchema = pageOf(FileLockGlobSchema, {
  directionId: Schema.String,
});

const FileLockPageFields = {
  ...FileLockTargetFields,
  ...PageFields,
} as const;

const FileLockFileSchema = Schema.Struct({
  locks: Schema.Record(Schema.String, Schema.Array(Schema.String)),
});

export {
  FileLockFileSchema,
  FileLockGlobsSchema,
  FileLockPageFields,
  FileLockPageSchema,
  FileLockTargetFields,
  FileLockViewSchema,
};
