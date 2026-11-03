import { createProject as createProjectAction } from "../../../shared/actions/project/create.js";
import type { PackSummary, Project } from "../../../shared/contracts.js";
import { callAction } from "../action-call.js";
import { oneLine } from "../edit-guards.js";
import type { EditDeps } from "../edit-guards.js";
import { ok } from "../edit-kit.js";
import type { Done } from "../edit-kit.js";
import { packOf } from "./pack-of.js";
import { createdResult } from "./projects-result.js";
import type { CreateProjectInput } from "./projects-schema.js";

interface CreateBody {
  kind: CreateProjectInput["kind"];
  name: string;
  packId?: string;
  prompt: string;
  startRun: false;
}

const NAME_TEXT_MAX = 60;

const chosenPack = (
  deps: EditDeps,
  input: CreateProjectInput
): Promise<PackSummary | null> => {
  if (!input.designSystemId) {
    return Promise.resolve(null);
  }

  return packOf(deps, input.designSystemId);
};

const createBody = (
  input: CreateProjectInput,
  pack: PackSummary | null
): CreateBody => {
  const body: CreateBody = {
    kind: input.kind,
    name: input.name,
    prompt: input.name,
    startRun: false,
  };

  if (pack) {
    body.packId = pack.id;
  }

  return body;
};

const mainDirection = (
  project: Project
): Project["directions"][number] | null =>
  project.directions.find((item) => item.id === "main") ??
  project.directions[0] ??
  null;

const createProjectTool = async (
  deps: EditDeps,
  input: CreateProjectInput
): Promise<Done> => {
  const pack = await chosenPack(deps, input);

  const created = await callAction<{ project: Project }>(
    deps,
    createProjectAction,
    { ...createBody(input, pack) }
  );

  const { project } = created;

  const main = mainDirection(project);

  return {
    activity: {
      directionId: main?.id ?? null,
      projectId: project.id,
      summary: `Created project ${oneLine(project.name, NAME_TEXT_MAX)}`,
    },
    result: ok(createdResult(project, main, pack)),
  };
};

export { createProjectTool };
