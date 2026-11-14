import type { Effect } from "effect";

import {
  runDirectionRead,
  runDirectionWrite,
} from "../../direct-edit/index.js";
import type { DirectionIds } from "../../direct-edit/index.js";
import type { KnownFailure } from "../../platform/attempt/index.js";
import { runCommit, applyEditGuard } from "./commit.js";
import type {
  EffectChange,
  EffectInfo,
  EffectItem,
  EffectStyleDeleted,
  EffectStyleSaved,
} from "./deps.js";
import { toEffectFailure } from "./effect-failure.js";
import { inspectEffects } from "./get.js";
import { listEffectStyles } from "./list.js";
import type { EffectPage } from "./list.js";
import { toEffectSetPlan } from "./plan.js";
import type {
  EffectScope,
  EffectSetPlan,
  EffectSetRequest,
  EffectTarget,
} from "./set-plan.js";
import { toStyleCreatePlan, toStyleDeletePlan } from "./style-plan.js";
import { toVariantEffectPlan, toVariantOf } from "./variant-plan.js";
import { inspectVariantEffects } from "./variant-read.js";

interface GetEffectCommand extends DirectionIds {
  readonly source: EffectTarget["source"];
  readonly variant: string;
}

interface SetEffectCommand extends DirectionIds, EffectSetRequest {
  readonly variant: string;
}

interface ListEffectCommand extends DirectionIds {
  readonly cursor: string | null;
  readonly limit: number;
}

interface CreateEffectCommand extends DirectionIds {
  readonly effects: readonly EffectItem[];
  readonly name: string;
}

interface DeleteEffectCommand extends DirectionIds {
  readonly name: string;
}

const toEffectInfo = (
  scope: EffectScope,
  command: GetEffectCommand
): Promise<EffectInfo> => {
  const variant = toVariantOf(command.variant);

  if (variant === "") {
    return inspectEffects(scope, command.source);
  }

  return inspectVariantEffects(scope, command.source, variant);
};

const toSetPlan = (
  scope: EffectScope,
  command: SetEffectCommand
): Promise<EffectSetPlan> => {
  const variant = toVariantOf(command.variant);

  if (variant === "") {
    return toEffectSetPlan(scope, command);
  }

  return toVariantEffectPlan(scope, command, variant);
};

const runEffectGet = (
  command: GetEffectCommand
): Effect.Effect<EffectInfo, KnownFailure> =>
  runDirectionRead(
    command,
    ({ direction, project }) =>
      toEffectInfo({ project, workTree: direction.workTree }, command),
    toEffectFailure
  );

const runEffectList = (
  command: ListEffectCommand
): Effect.Effect<EffectPage, KnownFailure> =>
  runDirectionRead(
    command,
    ({ direction, project }) =>
      listEffectStyles({ project, workTree: direction.workTree }, command),
    toEffectFailure
  );

const runEffectSet = (
  command: SetEffectCommand
): Effect.Effect<EffectChange, KnownFailure> =>
  runDirectionWrite(
    command,
    async ({ direction, project, runtime }): Promise<EffectChange> => {
      const scope = { direction, project, workTree: direction.workTree };
      applyEditGuard(runtime.editDeps, scope);
      const plan = await toSetPlan(scope, command);

      const version = await runCommit(
        runtime.editDeps,
        scope,
        plan.written,
        plan.title
      );

      return {
        className: plan.className,
        files: plan.written.map((entry) => entry.target.relative),
        hasShaderRuntime: plan.hasRuntime,
        styleName: plan.styleName,
        title: plan.title,
        versionId: version.id,
      };
    },
    toEffectFailure
  );

const runEffectCreate = (
  command: CreateEffectCommand
): Effect.Effect<EffectStyleSaved, KnownFailure> =>
  runDirectionWrite(
    command,
    async ({ direction, project, runtime }): Promise<EffectStyleSaved> => {
      const scope = { direction, project, workTree: direction.workTree };
      applyEditGuard(runtime.editDeps, scope);

      const plan = await toStyleCreatePlan(
        scope,
        command.name,
        command.effects
      );

      const version = await runCommit(
        runtime.editDeps,
        scope,
        plan.written,
        plan.title
      );

      return {
        className: plan.className,
        files: plan.written.map((entry) => entry.target.relative),
        isNew: plan.isNew,
        name: command.name,
        title: plan.title,
        versionId: version.id,
      };
    },
    toEffectFailure
  );

const runEffectDelete = (
  command: DeleteEffectCommand
): Effect.Effect<EffectStyleDeleted, KnownFailure> =>
  runDirectionWrite(
    command,
    async ({ direction, project, runtime }): Promise<EffectStyleDeleted> => {
      const scope = { direction, project, workTree: direction.workTree };
      applyEditGuard(runtime.editDeps, scope);
      const plan = await toStyleDeletePlan(scope, command.name);

      const version = await runCommit(
        runtime.editDeps,
        scope,
        plan.written,
        plan.title
      );

      return {
        files: plan.written.map((entry) => entry.target.relative),
        name: command.name,
        title: plan.title,
        usedBy: plan.usedBy,
        versionId: version.id,
      };
    },
    toEffectFailure
  );

const runEffectPreview = (
  command: DeleteEffectCommand
): Effect.Effect<EffectStyleDeleted, KnownFailure> =>
  runDirectionRead(
    command,
    async ({ direction, project }): Promise<EffectStyleDeleted> => {
      const plan = await toStyleDeletePlan(
        { project, workTree: direction.workTree },
        command.name
      );

      return {
        files: plan.written.map((entry) => entry.target.relative),
        name: command.name,
        title: plan.title,
        usedBy: plan.usedBy,
        versionId: null,
      };
    },
    toEffectFailure
  );

export {
  runEffectCreate,
  runEffectDelete,
  runEffectGet,
  runEffectList,
  runEffectPreview,
  runEffectSet,
};

export type {
  CreateEffectCommand,
  DeleteEffectCommand,
  GetEffectCommand,
  ListEffectCommand,
  SetEffectCommand,
};
