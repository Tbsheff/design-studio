import { inspectBlockKit } from "./block-kit.js";
import { toBlockTarget } from "./block-target.js";
import {
  assertCanEdit,
  planInsertJsx,
  publishVersion,
  savesSettled,
  toPreviewOrigin,
  writeAndCommitAll,
} from "./deps.js";
import type { DirectionRun, JsxInsertPlan } from "./deps.js";
import {
  getBlockTemplate,
  toBlockComponents,
  toBlockMarkup,
} from "./engine/index.js";
import { BlockError } from "./errors.js";

type BlockPosition = "after" | "before" | "inside";

interface InsertBlockCommand {
  readonly blockId: string;
  readonly directionId: string | null;
  readonly position: BlockPosition;
  readonly projectId: string;
  readonly targetSelector: string | null;
  readonly targetSource: string | null;
}

interface BlockInserted {
  readonly fallbacks: readonly string[];
  readonly imports: readonly string[];
  readonly layerIds: readonly string[];
  readonly versionId: string;
}

const toAddedImports = (items: JsxInsertPlan["imports"]): string[] => {
  const bySpecifier = new Map<string, string[]>();

  for (const item of items) {
    if (item.added) {
      const names = bySpecifier.get(item.specifier) ?? [];

      bySpecifier.set(item.specifier, [...names, item.name]);
    }
  }

  return [...bySpecifier].map(
    ([specifier, names]) =>
      `import { ${names.join(", ")} } from "${specifier}";`
  );
};

const toLayerId = (item: JsxInsertPlan["select"][number]): string =>
  `${item.file}:${item.line}:${item.col}`;

const toBlockImports = (
  names: readonly string[],
  imports: Readonly<Record<string, string>>
): Record<string, string> =>
  Object.fromEntries(
    names.flatMap((name) => {
      const file = imports[name] ?? null;

      if (file === null) {
        return [];
      }

      return [[name, file]];
    })
  );

const runBlockInsertTask = async (
  run: DirectionRun,
  command: InsertBlockCommand
): Promise<BlockInserted> => {
  const { direction, project, runtime } = run;
  const { editDeps } = runtime;
  const template = getBlockTemplate(command.blockId);

  if (template === null) {
    throw new BlockError(
      `There is no block named ${command.blockId}. Call list_block for the ids.`
    );
  }

  assertCanEdit(editDeps, project, direction);
  await savesSettled(project.id);

  const { workTree } = direction;
  const components = toBlockComponents(template);
  const kit = await inspectBlockKit(project, workTree, components);
  const rendered = toBlockMarkup(template, kit);

  const [previewOrigin, target] = await Promise.all([
    toPreviewOrigin(runtime.preview, project, direction),
    toBlockTarget({
      run,
      selector: command.targetSelector,
      source: command.targetSource,
    }),
  ]);

  const plan = await planInsertJsx(
    { previewOrigin, project, workTree },
    {
      imports: toBlockImports(components, kit.imports),
      jsx: rendered.markup,
      position: command.position,
      target,
    }
  );

  const title = `Insert ${template.name} block`;

  const version = await writeAndCommitAll(
    editDeps,
    project,
    direction,
    [plan],
    title,
    { kind: "manual", prompt: `${title}: ${plan.target.relative}` }
  );

  editDeps.history?.record({
    directionId: direction.id,
    files: [
      {
        after: plan.code,
        before: plan.original,
        file: plan.target.file,
        relative: plan.target.relative,
      },
    ],
    label: version.title,
    projectId: project.id,
    versionId: version.id,
  });

  await publishVersion(editDeps, project, direction, version);

  return {
    fallbacks: rendered.fallbacks,
    imports: toAddedImports(plan.imports),
    layerIds: plan.select.map((item) => toLayerId(item)),
    versionId: version.id,
  };
};

export { runBlockInsertTask };

export type { BlockInserted, BlockPosition, InsertBlockCommand };
