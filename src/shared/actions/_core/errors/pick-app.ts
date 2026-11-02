import { Schema } from "effect";

const AppCandidateSchema = Schema.Struct({
  appDir: Schema.String,
  framework: Schema.Literals(["next", "vite"]),
  name: Schema.String,
});

class PickApp extends Schema.TaggedError<PickApp>()("PickApp", {
  code: Schema.Literal("pick_app"),
  data: Schema.Struct({ candidates: Schema.Array(AppCandidateSchema) }),
  message: Schema.String,
}) {}

type AppCandidate = typeof AppCandidateSchema.Type;

export { AppCandidateSchema, PickApp };

export type { AppCandidate };
