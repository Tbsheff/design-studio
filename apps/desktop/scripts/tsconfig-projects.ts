import { readFile } from "node:fs/promises";

interface ProjectReference {
  readonly path: string;
}

interface SolutionConfig {
  readonly references: readonly ProjectReference[];
}

const SOLUTION = new URL("../../../tsconfig.json", import.meta.url);

const isSolutionConfig = (value: unknown): value is SolutionConfig =>
  typeof value === "object" &&
  value !== null &&
  "references" in value &&
  Array.isArray(value.references);

const toTsconfigProjects = async (): Promise<readonly string[]> => {
  const parsed: unknown = JSON.parse(await readFile(SOLUTION, "utf-8"));

  if (!isSolutionConfig(parsed)) {
    return [];
  }

  return parsed.references.map((reference) =>
    reference.path.replace(/^\.\//u, "")
  );
};

export { toTsconfigProjects };
