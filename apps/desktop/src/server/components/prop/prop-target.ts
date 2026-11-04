import { realpath } from "node:fs/promises";
import path from "node:path";

import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  followExport,
  loadTypeScript,
  parseModuleFile,
  readModule,
  resolveSource,
} from "./deps.js";
import type { Direction, Project } from "./deps.js";
import { getComponentModel } from "./engine/index.js";
import type { ComponentModel, Refusal } from "./engine/index.js";

interface PropScope {
  readonly direction: Direction;
  readonly project: Project;
  readonly workTree: string;
}

interface PropTarget {
  readonly exportName: string;
  readonly file: string;
  readonly model: ComponentModel;
  readonly relative: string;
  readonly root: string;
}

interface TargetCommand {
  readonly component: string;
  readonly directionId: string;
  readonly file: string;
  readonly projectId: string;
}

const toThrown = (refusal: Refusal): Error => {
  if (refusal.code === "conflict") {
    return new ConflictError(refusal.message);
  }

  if (refusal.code === "not_found") {
    return new NotFoundError(refusal.message);
  }

  return new BadRequestError(refusal.message);
};

const getTarget = async (
  scope: PropScope,
  command: TargetCommand
): Promise<PropTarget> => {
  const [source, root, ts] = await Promise.all([
    resolveSource(scope.workTree, command.file),
    realpath(scope.workTree),
    loadTypeScript(),
  ]);

  const ref = await followExport(ts, root, {
    file: source.file,
    name: command.component,
  });

  if (!ref) {
    throw new NotFoundError(
      `${command.file} has no component named ${command.component}.`
    );
  }

  const parsed = await readModule(ref.file);

  if (!parsed) {
    throw new BadRequestError(`${command.file} does not parse.`);
  }

  const relative = path.relative(root, ref.file);
  const model = getComponentModel(parsed.code, parsed.ast, ref.name, relative);

  if (!model.ok) {
    throw toThrown(model);
  }

  return {
    exportName: command.component,
    file: ref.file,
    model: model.value,
    relative,
    root,
  };
};

const toErrorCount = (code: string, file: string): number => {
  const ast = parseModuleFile(code, file);

  if (ast === null) {
    return Number.POSITIVE_INFINITY;
  }

  if ("errors" in ast && Array.isArray(ast.errors)) {
    return ast.errors.length;
  }

  return 0;
};

export { getTarget, toErrorCount, toThrown };

export type { PropScope, PropTarget, TargetCommand };
