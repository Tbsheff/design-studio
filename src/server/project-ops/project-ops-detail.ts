import { readFile } from "node:fs/promises";

import type { Input } from "../../shared/actions/_core/action.js";
import type { updateProject } from "../../shared/actions/project/update.js";
import type { Project } from "../../shared/contracts.js";
import type { ProjectOpsRuntime } from "./project-ops-runtime.js";

interface DesignMdSaved {
  readonly ok: true;
  readonly versionId: string | null;
}

interface ProjectFileBytes {
  readonly data: string;
  readonly mimeType: string;
}

const listCommandRulesIn = async (
  runtime: ProjectOpsRuntime,
  projectId: string
): Promise<{ readonly rules: readonly string[] }> => {
  const project = await runtime.projects.get(projectId);

  return { rules: await runtime.commandRules.list(project.id, null) };
};

const deleteCommandRuleIn = async (
  runtime: ProjectOpsRuntime,
  projectId: string,
  rule: string
): Promise<{ readonly rules: readonly string[] }> => {
  const project = await runtime.projects.get(projectId);

  return { rules: await runtime.commandRules.remove(project.id, rule, null) };
};

const updateSettingsIn = async (
  runtime: ProjectOpsRuntime,
  projectId: string,
  fields: Omit<Input<typeof updateProject>, "projectId">
): Promise<Project> => {
  await runtime.projects.get(projectId);

  return runtime.projects.updateSettings(
    projectId,
    runtime.parsers.settings(fields) ?? {}
  );
};

const setDesignMdIn = async (
  runtime: ProjectOpsRuntime,
  projectId: string,
  content: string
): Promise<DesignMdSaved> => {
  await runtime.projects.writeDesignMd(projectId, content);
  const project = await runtime.projects.get(projectId);
  const main = runtime.projects.mainDirection(project);

  const version = await runtime.versions.commitFile(
    project,
    main,
    "DESIGN.md",
    "Update DESIGN.md",
    { kind: "manual" }
  );

  if (version) {
    await runtime.recordVersion(project, main, version);
  }

  await runtime.emitStatus(project, main);

  return { ok: true, versionId: version?.id ?? null };
};

const readProjectFileIn = async (
  runtime: ProjectOpsRuntime,
  projectId: string,
  requested: string
): Promise<ProjectFileBytes> => {
  await runtime.projects.get(projectId);

  const file = await runtime.parsers.projectFile(
    runtime.projects.projectDir(projectId),
    requested
  );

  const bytes = await readFile(file);

  return { data: Buffer.from(bytes).toString("base64"), mimeType: "image/png" };
};

export {
  deleteCommandRuleIn,
  listCommandRulesIn,
  readProjectFileIn,
  setDesignMdIn,
  updateSettingsIn,
};

export type { DesignMdSaved, ProjectFileBytes };
