import { Schema } from "effect";

import type { SelectionContext } from "../../shared/actions/_core/contracts.js";
import {
  toOptionalFlag,
  toOptionalText,
  toRefinedToolInput,
  toSdkFieldSet,
  toTrimmedText,
} from "../agent-tools/index.js";
import type { ToolArgs, ToolDecoded } from "../agent-tools/index.js";
import { planDirectEdit, writeAtomic } from "../direct-edit/commit/index.js";
import {
  knownTokenVars,
  parseDirectEditRequest,
} from "../direct-edit/engine/index.js";
import {
  announcePlanned,
  domPatchOf,
  withdrawPlanned,
} from "../events/index.js";
import {
  applyDelta,
  describeElement,
  describeLocks,
  isLayerRef,
  lockDelta,
  lockOutcome,
  memoPage,
  probeLock,
  resolveLayerRefs,
  scopeOf,
} from "../page-probe/index.js";
import { refusal, writeProblem } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";
import { editPageUrl } from "./run-target.js";

type ToolText = Readonly<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}>;

export const LAYER_STATE_TOOL = "set_layer_state";
export const LIST_LOCKS_TOOL = "list_locked_layers";

const layerStateFields = {
  hidden: toOptionalFlag(
    "true writes display: none in the source, false shows it again."
  ),
  locked: toOptionalFlag(
    "true locks the layer (clicks on the canvas pass through it and its children), false unlocks it. Studio state, not a file change."
  ),
  name: Schema.optionalKey(
    Schema.NullOr(toTrimmedText(0, 80)).annotate({
      description:
        'New layer name, written as data-name. null or "" removes it.',
    })
  ),
  path: toOptionalText(
    0,
    300,
    "Page path. Leave out for the page of the frame in <canvas-context> (or the entry page)."
  ),
  selector: toTrimmedText(1, 2000).annotate({
    description: "Layer id from get_layers or a CSS selector of one element.",
  }),
};

export const layerStateShape = toSdkFieldSet(layerStateFields);

export const listLocksShape = toSdkFieldSet({ path: layerStateFields.path });

const layerStateSchema = toRefinedToolInput(layerStateFields, (input) => {
  if (
    input.locked !== undefined ||
    input.hidden !== undefined ||
    input.name !== undefined
  ) {
    return null;
  }

  return "pass locked, hidden or name";
});

const RUN_NOTE =
  "The run saves this change in its version, like your file edits.";

const VIEWPORT = { height: 900, width: 1440 };

function text(message: string, isError = false): ToolText {
  return {
    content: [{ text: message, type: "text" }],
    ...(isError ? { isError: true } : {}),
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type Input = ToolDecoded<typeof layerStateSchema>;

async function resolved(
  deps: DirectToolDeps,
  input: Input
): Promise<{ url: string; selector: string }> {
  const scope = scopeOf(deps.ctx.project.id, deps.ctx.direction.id);
  const raw = input.selector.trim();

  const page =
    input.path ?? (isLayerRef(raw) ? memoPage(scope, raw) : undefined);

  const url = editPageUrl(deps.ctx, page);

  if (!isLayerRef(raw)) {
    return { selector: raw, url };
  }

  const paths = await resolveLayerRefs(
    deps.preview,
    url,
    VIEWPORT,
    scope,
    [raw],
    input.hidden === undefined && input.name === undefined
  );

  return { selector: paths.get(raw) ?? raw, url };
}

async function writeEdit(
  deps: DirectToolDeps,
  raw: Record<string, unknown>
): Promise<string | null> {
  const { workTree } = deps.ctx.direction;

  const origin = deps.ctx.previewUrl
    ? new URL(deps.ctx.previewUrl).origin
    : null;

  const plan = await planDirectEdit(
    workTree,
    parseDirectEditRequest(raw),
    await knownTokenVars(workTree),
    { previewOrigin: async () => origin, projectKind: deps.ctx.project.kind }
  );

  const problem = writeProblem(deps.ctx, plan.target.relative);

  if (problem) {
    throw new Error(problem);
  }

  if (plan.patch.code === plan.original) {
    return null;
  }

  const { project, direction } = deps.ctx;

  const id = announcePlanned(project.id, direction.id, [
    domPatchOf(plan.request, plan.patch),
  ]);

  try {
    await writeAtomic(plan.target.file, plan.patch.code);
  } catch (error) {
    withdrawPlanned(project.id, direction.id, id);
    throw error;
  }

  return plan.target.relative;
}

async function sourceEdits(
  deps: DirectToolDeps,
  url: string,
  selector: string,
  input: Input
): Promise<string[]> {
  if (input.hidden === undefined && input.name === undefined) {
    return [];
  }

  const blocked = refusal(deps.ctx, LAYER_STATE_TOOL);

  if (blocked) {
    throw new Error(blocked);
  }

  const element = await describeElement(deps.preview, url, selector);

  if (!element) {
    throw new Error(`No element matches ${input.selector} on the page.`);
  }

  if (!element.source) {
    throw new Error(
      `${input.selector} has no source location, so it cannot be renamed or hidden here. Edit the file instead.`
    );
  }

  const target = { selector, source: element.source, tag: element.tag };
  const lines: string[] = [];

  if (input.name !== undefined) {
    lines.push(await renameEdit(deps, target, input.name));
  }

  if (input.hidden !== undefined) {
    lines.push(await hideEdit(deps, target, input.hidden));
  }

  return [...lines, RUN_NOTE];
}

interface EditTarget {
  source: NonNullable<SelectionContext["source"]>;
  selector: string;
  tag: string;
}

async function renameEdit(
  deps: DirectToolDeps,
  target: EditTarget,
  raw: string | null
): Promise<string> {
  const name = raw === null || raw === "" ? null : raw;
  const file = await writeEdit(deps, { ...target, name });

  if (!file) {
    return "The name was already set.";
  }

  return `${name ? `Renamed ${target.tag} to "${name}"` : `Removed the name of ${target.tag}`} in ${file}.`;
}

async function hideEdit(
  deps: DirectToolDeps,
  target: EditTarget,
  hidden: boolean
): Promise<string> {
  const file = await writeEdit(deps, {
    ...target,
    style: { display: hidden ? "none" : null },
  });

  return file
    ? `${hidden ? "Hid" : "Showed"} ${target.tag} in ${file}.`
    : "The layer was already in that state.";
}

async function lockEdit(
  deps: DirectToolDeps,
  url: string,
  selector: string,
  locked: boolean
): Promise<string> {
  const store = deps.layerLocks ?? null;

  if (!store) {
    throw new Error("Layer locks are not available in this run.");
  }

  const { project, direction } = deps.ctx;
  const current = await store.read(project.id, direction.id);
  const probe = await probeLock(deps.preview, url, selector, current.keys);

  if (!probe.found) {
    throw new Error(`No element matches ${selector} on the page.`);
  }

  const delta = lockDelta(probe, locked);

  const view = await store.update(project.id, direction.id, (keys) =>
    applyDelta(keys, delta)
  );

  return lockOutcome(probe, locked, view.keys.length);
}

export async function runSetLayerState(
  deps: DirectToolDeps,
  args: ToolArgs<typeof layerStateSchema>
): Promise<ToolText> {
  const parsed = layerStateSchema.safeParse(args);

  if (!parsed.success) {
    return text(`${LAYER_STATE_TOOL}: ${parsed.error}`, true);
  }

  if (!deps.ctx.previewUrl) {
    return text(
      "Preview is not running for this direction, so layers cannot be found.",
      true
    );
  }

  const input = parsed.data;

  try {
    const target = await resolved(deps, input);
    const lines = await sourceEdits(deps, target.url, target.selector, input);

    if (input.locked !== undefined) {
      lines.unshift(
        await lockEdit(deps, target.url, target.selector, input.locked)
      );
    }

    return text(lines.join(" "));
  } catch (error) {
    return text(`${LAYER_STATE_TOOL} failed: ${describeError(error)}`, true);
  }
}

export async function runListLockedLayers(
  deps: DirectToolDeps,
  args: { path?: string | undefined }
): Promise<ToolText> {
  const store = deps.layerLocks ?? null;

  if (!store) {
    return text("Layer locks are not available in this run.", true);
  }

  try {
    const view = await store.read(deps.ctx.project.id, deps.ctx.direction.id);

    const probe =
      view.keys.length > 0 && deps.ctx.previewUrl
        ? await probeLock(
            deps.preview,
            editPageUrl(deps.ctx, args.path),
            null,
            view.keys
          ).catch(() => null)
        : null;

    return text(
      describeLocks(view.keys, probe?.resolved ?? null, probe?.page ?? null)
    );
  } catch (error) {
    return text(`${LIST_LOCKS_TOOL} failed: ${describeError(error)}`, true);
  }
}
