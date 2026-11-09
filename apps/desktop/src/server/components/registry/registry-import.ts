import path from "node:path";

import {
  BadRequestError,
  ConflictError,
  assertCanEdit,
  loadConfig,
  publishVersion,
  savesSettled,
  writeAndCommitAll,
} from "./deps.js";
import type { DirectionRun } from "./deps.js";
import { toMissingDependencies, toRegistryFiles } from "./engine/index.js";
import type { PlannedFile, RegistryItem } from "./engine/index.js";
import { getRegistryItem, toRegistryUrl } from "./registry-item.js";
import {
  hasKitComponent,
  hasPath,
  inspectRegistryKit,
} from "./registry-kit.js";
import type { RegistryKit } from "./registry-kit.js";

interface ImportComponentCommand {
  readonly directionId: string | null;
  readonly name: string;
  readonly projectId: string;
  readonly registryUrl: string | null;
}

interface ComponentImported {
  readonly command: string;
  readonly files: readonly string[];
  readonly missingDependencies: readonly string[];
  readonly skipped: readonly string[];
  readonly versionId: string;
}

interface DependencyItems {
  readonly items: readonly RegistryItem[];
  readonly skipped: readonly string[];
}

const URL_START = /^https?:\/\//u;

const toDependencyRequest = (
  name: string,
  kit: RegistryKit,
  isOffline: boolean
): Parameters<typeof getRegistryItem>[0] => {
  if (URL_START.test(name)) {
    return { isOffline, name, style: kit.style, url: name };
  }

  return {
    isOffline,
    name,
    style: kit.style,
    url: toRegistryUrl(name, kit.style),
  };
};

const listDependencyItems = async (
  main: RegistryItem,
  kit: RegistryKit,
  isOffline: boolean
): Promise<DependencyItems> => {
  const names = [...new Set(main.registryDependencies)].filter(
    (name) => name !== main.name
  );

  const known = await Promise.all(
    names.map(async (name) => ({
      has: !URL_START.test(name) && (await hasKitComponent(kit, name)),
      name,
    }))
  );

  const wanted = known.filter((entry) => !entry.has);

  const items = await Promise.all(
    wanted.map((entry) =>
      getRegistryItem(toDependencyRequest(entry.name, kit, isOffline))
    )
  );

  return {
    items,
    skipped: known.flatMap((entry) => {
      if (entry.has) {
        return [entry.name];
      }

      return [];
    }),
  };
};

const toUniqueFiles = (files: readonly PlannedFile[]): PlannedFile[] => {
  const seen = new Set<string>();

  return files.filter((file) => {
    if (seen.has(file.relative)) {
      return false;
    }

    seen.add(file.relative);

    return true;
  });
};

const listTakenFiles = async (
  kit: RegistryKit,
  files: readonly PlannedFile[]
): Promise<string[]> => {
  const checks = await Promise.all(
    files.map(async (file) => ({
      file,
      isTaken: await hasPath(path.join(kit.root, file.relative)),
    }))
  );

  return checks.flatMap((check) => {
    if (check.isTaken) {
      return [check.file.relative];
    }

    return [];
  });
};

const toCommand = (missing: readonly string[]): string => {
  if (missing.length === 0) {
    return "";
  }

  return `pnpm add ${missing.join(" ")}`;
};

interface ImportPlan {
  readonly items: readonly RegistryItem[];
  readonly kit: RegistryKit;
  readonly planned: readonly PlannedFile[];
  readonly skipped: readonly string[];
}

const createImportPlan = async (
  command: ImportComponentCommand,
  workTree: string
): Promise<ImportPlan> => {
  const isOffline = loadConfig().agentMode === "mock";
  const kit = await inspectRegistryKit(workTree);

  const main = await getRegistryItem({
    isOffline,
    name: command.name,
    style: kit.style,
    url: command.registryUrl,
  });

  const dependencies = await listDependencyItems(main, kit, isOffline);
  const items = [main, ...dependencies.items];

  const planned = toUniqueFiles(
    items.flatMap((item) => toRegistryFiles(item, kit.aliases, kit.directories))
  );

  if (planned.length === 0) {
    throw new BadRequestError(
      `The registry item ${command.name} has no files that the kit can take.`
    );
  }

  const taken = await listTakenFiles(kit, planned);

  if (taken.length > 0) {
    throw new ConflictError(
      `These files exist already: ${taken.join(", ")}. Remove them first, or pick a different item.`
    );
  }

  return { items, kit, planned, skipped: dependencies.skipped };
};

const applyImportPlan = async (
  run: DirectionRun,
  plan: ImportPlan,
  name: string
): Promise<{
  readonly files: readonly string[];
  readonly versionId: string;
}> => {
  const { direction, project, runtime } = run;
  const { editDeps } = runtime;

  const written = plan.planned.map((file) => {
    const absolute = path.join(plan.kit.root, file.relative);

    return {
      absolute,
      code: file.code,
      relative: path.relative(direction.workTree, absolute),
    };
  });

  const title = `Add ${name} from shadcn`;

  const version = await writeAndCommitAll(
    editDeps,
    project,
    direction,
    written.map((file) => ({
      code: file.code,
      created: true,
      original: "",
      target: { file: file.absolute, relative: file.relative },
    })),
    title,
    { kind: "manual", prompt: `${title}: ${written.length} files` }
  );

  editDeps.history?.record({
    directionId: direction.id,
    files: written.map((file) => ({
      after: file.code,
      before: "",
      created: true,
      file: file.absolute,
      relative: file.relative,
    })),
    label: version.title,
    projectId: project.id,
    versionId: version.id,
  });

  await publishVersion(editDeps, project, direction, version);

  return {
    files: written.map((file) => file.relative),
    versionId: version.id,
  };
};

const runRegistryImportTask = async (
  run: DirectionRun,
  command: ImportComponentCommand
): Promise<ComponentImported> => {
  const { direction, project, runtime } = run;

  assertCanEdit(runtime.editDeps, project, direction);
  await savesSettled(project.id);

  const plan = await createImportPlan(command, direction.workTree);
  const applied = await applyImportPlan(run, plan, command.name);
  const missing = toMissingDependencies(plan.items, plan.kit.have);

  return {
    command: toCommand(missing),
    files: applied.files,
    missingDependencies: missing,
    skipped: plan.skipped,
    versionId: applied.versionId,
  };
};

export { runRegistryImportTask };

export type { ComponentImported, ImportComponentCommand };
