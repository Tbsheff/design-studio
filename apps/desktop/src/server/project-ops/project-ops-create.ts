import type { Input } from "@design-studio/actions/_core/action";
import type { createProject } from "@design-studio/actions/project/create";
import type { importProject } from "@design-studio/actions/project/import";
import type { Project, ProjectKind, RunLevel } from "@design-studio/actions/_core/contracts";
import { nameFromPrompt } from "@design-studio/actions/_core/folders";
import type { AttachResponse } from "../app/index.js";
import {
  captureReferencePage,
  parseReferenceUrls,
} from "../design-system/index.js";
import { BadRequestError } from "../platform/errors/index.js";
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

const kindOf = (kind: string): ProjectKind => {
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
  const kind = kindOf(input.kind ?? "html");
  const settings = runtime.parsers.settings(input.settings);
  const pack = await runtime.parsers.packOf(runtime.packs, input.packId);
  const level = runtime.parsers.level(input.level);
  const shouldStartRun = runtime.parsers.startRun(input.startRun);
  const { parentPath: requestedParent, prompt } = input;
  const name = input.name ?? nameFromPrompt(input.prompt);

  const referenceUrls = parseReferenceUrls(
    input.referenceUrls,
    runtime.config.fetchAllowLoopback === true
  );

  const parentPath = requestedParent ?? (await runtime.defaultFolder.ensure());

  const created = await runtime.projects.createInFolder({
    kind,
    name,
    parentPath,
    settings,
  });

  await runtime.addParentFolder(requestedParent, created);
  await runtime.versions.ensureRepo(created);
  const project = await runtime.prepareCreated(created, pack, input.designMd);
  const main = runtime.projects.mainDirection(project);
  runtime.watchDirection(project, main);

  if (!shouldStartRun) {
    return { project, runId: null };
  }

  const first: FirstRun = { level, prompt, referenceUrls };
  const runId = await startFirstRun(runtime, project, first);

  return { project, runId };
};

interface ImportOptions {
  readonly appDir?: string;
  readonly skipApp: boolean;
}

const importOptionsOf = (
  appDir: string | null,
  skipApp: boolean
): ImportOptions => {
  if (appDir) {
    return { appDir, skipApp };
  }

  return { skipApp };
};

const importProjectIn = async (
  runtime: ProjectOpsRuntime,
  input: ImportInput
): Promise<ImportedProject> => {
  const skipApp = input.skipApp === true;

  const imported = await runtime.projects.importFolder(
    input.path,
    importOptionsOf(input.appDir ?? null, skipApp)
  );

  if (imported.app) {
    return runtime.attach(imported);
  }

  await runtime.versions.ensureRepo(imported);
  const project = await runtime.commitInit(imported);
  runtime.watchDirection(project, runtime.projects.mainDirection(project));

  return { project };
};

export { createProjectIn, importProjectIn };

export type { CreatedProject, ImportedProject };
