import type {
  CreateTokenResult,
  DesignSystemState,
  DirectEditBatchResult,
  DirectEditResult,
  RenderCheckResult,
  StructureEditResult,
  TokenPreviewResult,
  UpdateTokensResult,
} from "@design-studio/contracts";
import { isStyleReplaceBody } from "@design-studio/contracts/style-search";
import type { StyleReplaceResult } from "@design-studio/contracts/style-search";

import type { ArrangeResult } from "../../shared/arrange.js";
import type { CommitTweaksResult, TweaksState } from "../../shared/tweaks.js";
import { warmPropsTypes } from "../components/index.js";
import { appTokensFor } from "../design-system/app-tokens/source.js";
import {
  previewAppTokens,
  updateAppTokens,
} from "../design-system/app-tokens/write.js";
import { createToken } from "../design-system/create-token.js";
import { readDesignSystemState } from "../design-system/state.js";
import { previewTokens } from "../design-system/token-preview.js";
import { updateTokens } from "../design-system/update-tokens.js";
import { commitTweaks } from "../tweaks/commit.js";
import { readTweaksState } from "../tweaks/store.js";
import { commitDirectEdit } from "./commit/apply.js";
import { applyArrange, isArrangeBody } from "./commit/arrange.js";
import { applyDirectEditBatch } from "./commit/batch.js";
import { applyStyleReplace } from "./commit/replace.js";
import { applyStructureEdit } from "./commit/structure-apply.js";
import type { DirectEditRuntime } from "./direct-edit-core.js";
import { isDirectEditBatch, isStructureEdit } from "./engine/validate.js";

interface DirectionRef {
  readonly directionId: string;
  readonly projectId: string;
}

type EditBody = Readonly<Record<string, unknown>>;

type EditOutcome =
  | ArrangeResult
  | DirectEditBatchResult
  | DirectEditResult
  | StructureEditResult
  | StyleReplaceResult;

const designSystemOf = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef
): Promise<DesignSystemState> => {
  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  return readDesignSystemState(project, direction);
};

const previewTokenChanges = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
): Promise<TokenPreviewResult> => {
  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  runtime.watchTokenSources(project);

  const appTokens = await appTokensFor(project, direction);

  if (appTokens) {
    return previewAppTokens(appTokens, body);
  }

  return previewTokens(direction.workTree, body);
};

const createTokenIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
): Promise<CreateTokenResult> =>
  runtime.withDirection(ref.projectId, ref.directionId, (project, direction) =>
    createToken(runtime.editDeps, project, direction, body)
  );

const updateTokensIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
): Promise<UpdateTokensResult> =>
  runtime.withDirection(
    ref.projectId,
    ref.directionId,
    async (project, direction) =>
      (await updateAppTokens(runtime.editDeps, project, direction, {
        raw: body,
        title: null,
      })) ?? updateTokens(runtime.editDeps, project, direction, body)
  );

const readTweaks = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef
): Promise<TweaksState> => {
  const { direction } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  return readTweaksState(direction.workTree);
};

const commitTweaksIn = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
): Promise<CommitTweaksResult> =>
  runtime.withDirection(ref.projectId, ref.directionId, (project, direction) =>
    commitTweaks(runtime.editDeps, project, direction, body)
  );

const applyEditBody = (
  runtime: DirectEditRuntime,
  ref: DirectionRef,
  body: EditBody
): Promise<EditOutcome> =>
  runtime.withDirection<EditOutcome>(
    ref.projectId,
    ref.directionId,
    (project, direction) => {
      const { editDeps, preview } = runtime;

      if (isArrangeBody(body)) {
        return applyArrange({ ...editDeps, preview }, project, direction, body);
      }

      if (isStyleReplaceBody(body)) {
        return applyStyleReplace(editDeps, project, direction, body);
      }

      if (isStructureEdit(body)) {
        return applyStructureEdit(editDeps, project, direction, body);
      }

      if (isDirectEditBatch(body)) {
        return applyDirectEditBatch(editDeps, project, direction, body);
      }

      return commitDirectEdit(editDeps, project, direction, body);
    }
  );

const previewUrlOf = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef
): Promise<{ url: string }> => {
  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  const url = await runtime.preview.directionUrl(project, direction);
  warmPropsTypes(project, direction);

  return { url };
};

const treeOf = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef
): Promise<{ files: string[] }> => {
  const { direction } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  return { files: await runtime.listWorkTree(direction.workTree) };
};

const renderCheckOf = async (
  runtime: DirectEditRuntime,
  ref: DirectionRef
): Promise<{ results: RenderCheckResult[] }> => {
  const { direction, project } = await runtime.loadDirection(
    ref.projectId,
    ref.directionId
  );

  if (project.app) {
    return {
      results: await runtime.preview.renderCheck(project, direction, {
        appOnly: true,
      }),
    };
  }

  return { results: await runtime.preview.renderCheck(project, direction) };
};

export {
  applyEditBody,
  commitTweaksIn,
  createTokenIn,
  designSystemOf,
  previewTokenChanges,
  previewUrlOf,
  readTweaks,
  renderCheckOf,
  treeOf,
  updateTokensIn,
};

export type { DirectionRef, EditBody };
