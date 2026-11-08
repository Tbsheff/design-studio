import { DEFAULT_FRAME_STATE } from "@design-studio/contracts/frame-state";
import { Schema } from "effect";

import {
  toDefaulted,
  toOptionalText,
  toSdkFieldSet,
  toToolInput,
} from "../agent-tools/index.js";
import type { ToolArgs } from "../agent-tools/index.js";
import { findFrame } from "../canvas/index.js";
import { layerTreeText } from "../mcp/layer-tools.js";
import {
  isLayerRef,
  LayerRefError,
  memoPage,
  resolveLayerRef,
  scopeOf,
  toProbeTarget,
} from "../page-probe/index.js";
import type { Viewport } from "../page-probe/index.js";
import { canvasFrames } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";
import {
  editPage,
  editPageUrl,
  isContextFrame,
  pageUrl,
} from "./run-target.js";

type ToolText = Readonly<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}>;

const EDIT_VIEWPORT: Viewport = { height: 900, width: 1440 };
const SELECTOR_KEYS = ["selector", "targetSelector"] as const;

const getLayersFields = {
  depth: toDefaulted(
    Schema.Int.check(Schema.isBetween({ maximum: 30, minimum: 0 })),
    8,
    'Levels below the root to list. Default 8. Deeper children show as "+N inside".'
  ),
  frame: toOptionalText(
    1,
    60,
    "Canvas frame id or @label from canvas_list. It sets the page and the size. Leave out for the frame in <canvas-context>."
  ),
  path: toOptionalText(
    0,
    300,
    "Page path instead of the frame page. Leave out for the page of the frame in <canvas-context> (or the entry page)."
  ),
  root: toOptionalText(
    1,
    2000,
    "Layer id from an earlier get_layers or a CSS selector: list only this element and what is inside it."
  ),
};

export const getLayersSdkFields = toSdkFieldSet(getLayersFields);

const layersSchema = toToolInput(getLayersFields);

function text(message: string, isError = false): ToolText {
  return {
    content: [{ text: message, type: "text" }],
    ...(isError ? { isError: true } : {}),
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function framePage(
  deps: DirectToolDeps,
  ref: string | undefined
): Promise<{ path?: string; viewport: Viewport; state: string }> {
  const { target } = deps.ctx;

  if (!ref || isContextFrame(deps.ctx, ref)) {
    return target
      ? {
          state: target.state,
          viewport: { height: target.height, width: target.width },
          ...(target.path ? { path: target.path } : {}),
        }
      : { state: DEFAULT_FRAME_STATE, viewport: EDIT_VIEWPORT };
  }

  const frames = await canvasFrames(deps);
  const frame = findFrame(frames, ref);

  if (!frame) {
    throw new LayerRefError(
      `No frame ${ref} on the canvas. Call canvas_list for the frame ids.`
    );
  }

  const state = frame.id === target?.id ? target.state : DEFAULT_FRAME_STATE;

  return {
    state,
    viewport: { height: frame.height, width: frame.width },
    ...(frame.path ? { path: frame.path } : {}),
  };
}

export async function runGetLayers(
  deps: DirectToolDeps,
  args: ToolArgs<typeof layersSchema>
): Promise<ToolText> {
  const parsed = layersSchema.safeParse(args);

  if (!parsed.success) {
    return text(`get_layers: ${parsed.error}`, true);
  }

  if (!deps.ctx.previewUrl) {
    return text(
      "Preview is not running for this direction, so the layers cannot be read.",
      true
    );
  }

  try {
    const frame = await framePage(deps, parsed.data.frame);
    const page = parsed.data.path ?? frame.path;
    const url = pageUrl(deps.ctx.previewUrl, page ?? "", frame.state);
    const scope = scopeOf(deps.ctx.project.id, deps.ctx.direction.id);

    const tree = await layerTreeText(deps.preview, {
      depth: parsed.data.depth,
      page,
      root: parsed.data.root,
      scope,
      url,
      viewport: frame.viewport,
    });

    return tree === null
      ? text(`No element matches ${parsed.data.root} on the page.`, true)
      : text(tree);
  } catch (error) {
    return text(
      error instanceof LayerRefError
        ? error.message
        : `get_layers failed: ${describeError(error)}`,
      true
    );
  }
}

type LayerArgs = { path?: string | undefined } & Partial<
  Record<(typeof SELECTOR_KEYS)[number], string | undefined>
>;

export async function resolveSelectors<A extends LayerArgs>(
  deps: DirectToolDeps,
  args: A
): Promise<A> {
  const keys = SELECTOR_KEYS.filter((key) => isLayerRef(args[key]));

  if (keys.length === 0 || !deps.ctx.previewUrl) {
    return args;
  }

  const scope = scopeOf(deps.ctx.project.id, deps.ctx.direction.id);
  const out: A = { ...args };

  for (const key of keys) {
    const ref = String(args[key]).trim();

    const page =
      args.path ?? memoPage(scope, ref) ?? editPage(deps.ctx, undefined)?.path;

    out[key] = (await resolveLayerRef(
      toProbeTarget(
        deps.preview,
        editPageUrl(deps.ctx, page),
        EDIT_VIEWPORT,
        scope
      ),
      ref
    )) as A[typeof key];

    if (out.path === undefined && page !== undefined) {
      out.path = page;
    }
  }

  return out;
}

export function withLayerIds<A extends LayerArgs>(
  deps: DirectToolDeps,
  run: (args: A) => Promise<ToolText>
): (args: A) => Promise<ToolText> {
  return async (args) => {
    let resolved: A;

    try {
      resolved = await resolveSelectors(deps, args);
    } catch (error) {
      return text(
        error instanceof LayerRefError
          ? error.message
          : `Layer id lookup failed: ${describeError(error)}`,
        true
      );
    }

    return run(resolved);
  };
}
