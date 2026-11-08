import { readFile } from "node:fs/promises";

import type { DirectEditRequest } from "@design-studio/contracts";

import type {
  EditScope,
  PlannedDirectEdit as PlannedEdit,
} from "../../events/index.js";
import { hasClassChange } from "../engine/classes.js";
import { DirectEditError } from "../engine/errors.js";
import type { PatchResult } from "../engine/errors.js";
import { assertKnownTokens } from "../engine/tokens.js";
import { patchSource, resolveSource, themeForFile } from "./edit-source.js";
import { findTextSource } from "./text-source.js";

export async function planDirectEdit(
  workTree: string,
  request: DirectEditRequest,
  known: Set<string> | null,
  scope?: EditScope
): Promise<PlannedEdit> {
  assertKnownTokens(request.style, known);
  const target = await resolveSource(workTree, request.source.file);
  const original = await readFile(target.file, "utf-8");
  const theme = await themeForFile(workTree, target.relative, original, scope);

  try {
    return {
      request,
      target,
      original,
      patch: patchSource(target.relative, original, request, theme),
    };
  } catch (error) {
    if (!isDataText(error, request)) {
      throw error;
    }

    return planTextSource(
      workTree,
      request,
      (await scope?.previewOrigin?.().catch(() => null)) ?? null,
      error
    );
  }
}

function isDataText(
  error: unknown,
  request: DirectEditRequest
): error is DirectEditError {
  const onlyText =
    request.text !== undefined &&
    Object.keys(request.style ?? {}).length === 0 &&
    !hasClassChange(request.classes) &&
    request.name === undefined;

  return (
    onlyText &&
    error instanceof DirectEditError &&
    error.code === "text_from_data"
  );
}

async function planTextSource(
  workTree: string,
  request: DirectEditRequest,
  previewOrigin: string | null,
  error: DirectEditError
): Promise<PlannedEdit> {
  const lookup = await findTextSource(
    { workTree, previewOrigin },
    request.source,
    request.hints ?? null
  );

  if ("reason" in lookup) {
    throw new DirectEditError(
      "text_from_data",
      `${error.message.replace(/ Change the data there, or ask the agent\.$/, "")} ${lookup.reason} Ask the agent to change it.`
    );
  }

  const { hit } = lookup;
  const code = hit.write(request.text ?? "");

  const patch: PatchResult = {
    code,
    tag: request.tag ?? "text",
    applied: { style: [], text: true },
    textSource: hit.info,
  };

  return {
    request,
    target: { file: hit.file, relative: hit.relative },
    original: hit.original,
    patch,
  };
}
