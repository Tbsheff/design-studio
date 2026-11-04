import { Schema } from "effect";

const SkillOriginSchema = Schema.Union([
  Schema.Literal("personal"),
  Schema.TemplateLiteral(["plugin:", Schema.String]),
]);

const SkillInfoSchema = Schema.Struct({
  description: Schema.String,
  id: Schema.String,
  modelInvocable: Schema.Boolean,
  name: Schema.String,
  needsBash: Schema.Boolean,
  origin: SkillOriginSchema,
  sourcePath: Schema.String,
});

const SkillProblemSchema = Schema.Struct({
  reason: Schema.String,
  source: Schema.String,
});

const SkillCatalogSchema = Schema.Struct({
  problems: Schema.Array(SkillProblemSchema),
  skills: Schema.Array(SkillInfoSchema),
});

type SkillCatalog = typeof SkillCatalogSchema.Type;

export {
  SkillCatalogSchema,
  SkillInfoSchema,
  SkillOriginSchema,
  SkillProblemSchema,
};

export type { SkillCatalog };
