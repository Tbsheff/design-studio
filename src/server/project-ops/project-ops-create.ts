import type { Input } from "../../shared/actions/_core/action.js";
import type { createProject } from "../../shared/actions/project/create.js";
import type { importProject } from "../../shared/actions/project/import.js";
import type { Project, ProjectKind, RunLevel } from "../../shared/contracts.js";
import { nameFromPrompt } from "../../shared/folders.js";
import type { AttachResponse } from "../app/first-version.js";
import {
  captureReferencePage,
  parseReferenceUrls,
} from "../design-system/reference-page.js";
import { BadRequestError } from "../store/errors.js";
import type { ProjectOpsRuntime } from "./project-ops-runtime.js";

type CreateInput = Input<typeof createProject>;

type ImportInput = Input<typeof importProject>;

interface CreatedProject {
  readonly project: Project;
  readonly runId: string | null;
}

interface ImportedProject extends Partial<AttachResponse> {
  readonly project: Project;
}

interface FirstRun {
  readonly level: RunLevel | undefined;
  readonly prompt: string;
  readonly referenceUrls: readonly string[];
}

const kindOf = (kind: string | undefined): ProjectKind => {
  if (kind === undefined) {
    return "html";
  }

  if (kind !== "html" && kind !== "react") {
    throw new BadRequestError("kind must be html or react");
  }

  return kind;
};

const startFirstRun = async (
  runtime: ProjectOpsRuntime,
  project: Project,
  first: FirstRun
): Promise<string> => {
  const allowLoopback = runtime.config.fetchAllowLoopback === true;

  const referencePages = await Promise.all(
    first.referenceUrls.map((url) => captureReferencePage(url, allowLoopback))
  );

  const request: Parameters<ProjectOpsRuntime["startRun"]>[2] = {
    mode: "edit",
    prompt: first.prompt,
  };

  if (first.level) {
    request.level = first.level;
  }

  if (referencePages.length > 0) {
    request.referencePages = referencePages;
  }

  return runtime.startRun(
    project,
    runtime.projects.mainDirection(project),
    request
  );
};

const createProjectIn = async (
  runtime: ProjectOpsRuntime,
  input: CreateInput
): Promise<CreatedProject> => {
  const kind = kindOf(input.kind);
  const settings = runtime.parsers.settings(input.settings);
  const pack = await runtime.parsers.packOf(runtime.packs, input.packId);
  const level = runtime.parsers.level(input.level);
  const shouldStartRun = runtime.parsers.startRun(input.startRun);
  const { parentPath } = input;
  const name = input.name ?? nameFromPrompt(input.prompt);

  const referenceUrls = parseReferenceUrls(
    input.referenceUrls,
    runtime.config.fetchAllowLoopback === true
  );

  const folder = parentPath ?? (await runtime.defaultFolder.ensure());

  const created = await runtime.projects.createInFolder({
    kind,
    settings,
    name,
    parentPath: folder,
  });

  await runtime.addParentFolder(parentPath, created);
  await runtime.versions.ensureRepo(created);
  const project = await runtime.prepareCreated(created, pack, input.designMd);
  const main = runtime.projects.mainDirection(project);
  runtime.watchDirection(project, main);

  if (!shouldStartRun) {
    return { project, runId: null };
  }

  const first: FirstRun = { level, referenceUrls, prompt: input.prompt };
  const runId = await startFirstRun(runtime, project, first);

  return { project, runId };
};

const importProjectIn = async (
  runtime: ProjectOpsRuntime,
  input: ImportInput
): Promise<ImportedProject> => {
  const options: { appDir?: string; skipApp: boolean } = {
    skipApp: input.skipApp === true,
  };

  if (input.appDir) {
    options.appDir = input.appDir;
  }

  const imported = await runtime.projects.importFolder(input.path, options);

  if (imported.app) {
    return runtime.attach(imported);
  }

  await runtime.versions.ensureRepo(imported);
  const project = await runtime.commitInit(imported);
  runtime.watchDirection(project, runtime.projects.mainDirection(project));

  return { project };
};

export { createProjectIn, importProjectIn };
