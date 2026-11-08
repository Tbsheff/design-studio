import { Schema } from "effect";

const StoredFixtureSchema = Schema.Struct({
  createdAt: Schema.String,
  directionId: Schema.String,
  file: Schema.String,
  folder: Schema.String,
  frameId: Schema.String,
  id: Schema.String,
  route: Schema.String,
  sourceRoute: Schema.String,
});

const FixtureRegistrySchema = Schema.Struct({
  fixtures: Schema.Array(StoredFixtureSchema),
});

type StoredFixture = typeof StoredFixtureSchema.Type;

type FixtureRegistry = typeof FixtureRegistrySchema.Type;

interface PlannedFile {
  readonly code: string;
  readonly relative: string;
}

interface FixturePlan {
  readonly files: readonly PlannedFile[];
  readonly folder: string;
  readonly id: string;
  readonly label: string;
  readonly removed: readonly string[];
  readonly sourceRoute: string;
  readonly unresolved: readonly string[];
  readonly url: string;
}

interface CreateFixtureCommand {
  readonly directionId: string;
  readonly params: Readonly<Record<string, string>>;
  readonly projectId: string;
  readonly route: string;
  readonly searchParams: Readonly<Record<string, string>>;
  readonly shell: "inherit" | "root";
}

interface DeleteFixtureCommand {
  readonly fixtureId: string;
  readonly projectId: string;
}

interface FixtureCreated {
  readonly file: string;
  readonly fixtureId: string;
  readonly frameId: string;
  readonly removed: readonly string[];
  readonly route: string;
  readonly unresolved: readonly string[];
  readonly versionId: string | null;
}

interface FixtureDeleted {
  readonly file: string;
  readonly fixtureId: string;
  readonly frameId: string;
}

const FIXTURE_FOLDER = "%5F%5Fstudio-fixture";

const FIXTURE_URL_SEGMENT = "__studio-fixture";

export {
  FIXTURE_FOLDER,
  FIXTURE_URL_SEGMENT,
  FixtureRegistrySchema,
  StoredFixtureSchema,
};

export type {
  CreateFixtureCommand,
  DeleteFixtureCommand,
  FixtureCreated,
  FixtureDeleted,
  FixturePlan,
  FixtureRegistry,
  PlannedFile,
  StoredFixture,
};
