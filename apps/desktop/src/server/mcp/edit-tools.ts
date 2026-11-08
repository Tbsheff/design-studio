import {
  PENDING_VERSION,
  savedVersionId,
  savesSettled,
} from "../direct-edit/commit/index.js";
import { isKnownError } from "../platform/errors/index.js";
import { z } from "../platform/zod-bridge/index.js";
import type { ActivityDraft } from "./activity.js";
import { EditError, type EditDeps } from "./edit-guards.js";
import type { Done, Meta, ToolSpec } from "./edit-kit.js";
import { mcpErrorText } from "./error-copy.js";
import { FolderError } from "./folders.js";
import { CLOUD_LEGACY_TOOLS } from "./legacy/cloud.js";
import { COMMENTS_LEGACY_TOOLS } from "./legacy/comments.js";
import { DEVSERVER_LEGACY_TOOLS } from "./legacy/devserver.js";
import { DIRECT_EDIT_LEGACY_TOOLS } from "./legacy/direct-edit.js";
import { EVENTS_LEGACY_TOOLS } from "./legacy/events.js";
import { MCP_LIFE_LEGACY_TOOLS } from "./legacy/mcp-life.js";
import { MCP_READ_LEGACY_TOOLS } from "./legacy/mcp-read.js";
import { LEGACY_ORDER } from "./legacy/order.js";
import { ORG_SCOPE_LEGACY_TOOLS } from "./legacy/org-scope.js";
import { PACKS_LEGACY_TOOLS } from "./legacy/packs.js";
import { PROJECTS_LEGACY_TOOLS } from "./legacy/projects.js";
import { PUBLISH_LEGACY_TOOLS } from "./legacy/publish.js";
import { SESSION_LEGACY_TOOLS } from "./legacy/session.js";
import { STUDIO_LEGACY_TOOLS } from "./legacy/studio.js";
import { VERSIONS_LEGACY_TOOLS } from "./legacy/versions.js";
import { ACTION_EDIT_TOOLS } from "./registry.js";
import type { ToolDef, ToolResult } from "./tool-types.js";

const LEGACY_TOOLS: ToolSpec[] = [
  ...CLOUD_LEGACY_TOOLS,
  ...COMMENTS_LEGACY_TOOLS,
  ...DEVSERVER_LEGACY_TOOLS,
  ...DIRECT_EDIT_LEGACY_TOOLS,
  ...EVENTS_LEGACY_TOOLS,
  ...MCP_LIFE_LEGACY_TOOLS,
  ...MCP_READ_LEGACY_TOOLS,
  ...ORG_SCOPE_LEGACY_TOOLS,
  ...PACKS_LEGACY_TOOLS,
  ...PROJECTS_LEGACY_TOOLS,
  ...PUBLISH_LEGACY_TOOLS,
  ...SESSION_LEGACY_TOOLS,
  ...STUDIO_LEGACY_TOOLS,
  ...VERSIONS_LEGACY_TOOLS,
];

const ORDER_RANK = new Map(LEGACY_ORDER.map((name, index) => [name, index]));

const rankOf = (tool: ToolSpec): number =>
  ORDER_RANK.get(tool.name) ?? LEGACY_ORDER.length;

const ORDERED_TOOLS = LEGACY_TOOLS.toSorted(
  (left, right) => rankOf(left) - rankOf(right)
);

const TOOLS_BY_NAME = new Map(ORDERED_TOOLS.map((tool) => [tool.name, tool]));

function jsonSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _drop, ...rest } = z.toJSONSchema(schema, {
    io: "input",
    unrepresentable: "any",
  }) as Record<string, unknown>;
  return rest;
}

export const RENDER_WAIT_TOOLS = new Set([
  "edit_element",
  "batch_edit",
  "set_props",
  "insert_component",
  "insert_jsx",
  "clear_text",
  "write_file",
  "apply_fix",
  "replace_style",
  "undo",
  "redo",
  "create_component",
  "swap_instance",
  "set_tweak",
  "set_image",
  "draw_vector",
  "boolean_shapes",
  "paint_shape",
  "move_element",
  "revert_hunk",
  "import_figma_frame",
  "set_motion",
  "set_fill",
  "set_spacing",
  "set_stacking",
  "set_breakpoint_style",
  "set_state_style",
  "set_accessibility",
  "apply_text_style",
  "detach_text_style",
  "create_text_style",
  "update_text",
  "insert_icon",
  "place_image",
  "apply_content",
  "apply_token",
  "create_image",
  "create_component_variant",
  "update_component_variant",
  "import_page",
  "arrange",
  "create_gallery",
  "create_viewport",
  "run_viewport",
]);
const WAIT_PROPERTY = {
  type: "string",
  enum: ["render"],
  description:
    'Leave out to get the result as soon as the file is written and saved as a version; the app rebuilds in the background, and get_screenshot, get_layers and review_frame wait for that rebuild. "render": also wait until the dev server has rebuilt the page.',
};

function withWait(
  name: string,
  schema: Record<string, unknown>
): Record<string, unknown> {
  if (!RENDER_WAIT_TOOLS.has(name)) return schema;
  return {
    ...schema,
    properties: {
      ...(schema.properties as Record<string, unknown> | undefined),
      wait: WAIT_PROPERTY,
    },
  };
}

function toolDef(name: string, schema: z.ZodType, meta: Meta): ToolDef {
  return {
    name,
    title: meta.title,
    description: meta.description,
    inputSchema: withWait(name, jsonSchema(schema)),
    annotations: {
      readOnlyHint: meta.readOnly === true,
      destructiveHint: meta.destructive === true,
      idempotentHint: meta.idempotent === true,
      openWorldHint: false,
    },
  };
}

function toWaitDef(tool: ToolDef): ToolDef {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: withWait(
      tool.name,
      tool.inputSchema as Record<string, unknown>
    ),
    annotations: tool.annotations,
  };
}

export const EDIT_TOOLS: ToolDef[] = [
  ...ORDERED_TOOLS.map((tool) => toolDef(tool.name, tool.schema, tool.meta)),
  ...ACTION_EDIT_TOOLS.map((tool) => toWaitDef(tool)),
];

export const EDIT_NAMES = new Set<string>(TOOLS_BY_NAME.keys());

async function run(
  deps: EditDeps,
  name: string,
  args: Record<string, unknown>,
  client: string
): Promise<Done> {
  const tool = TOOLS_BY_NAME.get(name);
  if (!tool) throw new EditError(`unknown tool ${name}`);
  return tool.run(deps, args, client);
}

async function recordActivity(
  deps: EditDeps,
  name: string,
  client: string,
  draft: ActivityDraft
): Promise<void> {
  const save = (item: ActivityDraft) =>
    deps.activity.record(name, client, item).then(
      () => undefined,
      (error: unknown) => console.error("[mcp] activity not saved", error)
    );
  if (!draft.versionId?.startsWith(PENDING_VERSION)) return save(draft);
  void savesSettled(draft.projectId).then(() =>
    save({ ...draft, versionId: savedVersionId(draft.versionId as string) })
  );
}

const FAILED_TARGET = z.object({ projectId: z.string() });

export async function callEditTool(
  deps: EditDeps,
  name: string,
  args: Record<string, unknown>,
  client: string
): Promise<ToolResult> {
  if (!EDIT_NAMES.has(name)) throw new EditError(`unknown tool ${name}`);
  const mark = deps.history?.mark?.() ?? null;
  const target = FAILED_TARGET.safeParse(args);
  const failedProject = target.success ? target.data.projectId : null;
  const forgetFailed = async (): Promise<void> => {
    if (mark !== null && failedProject !== null)
      await deps.history?.dropUnsaved?.(failedProject, mark);
  };
  try {
    const done = await run(deps, name, args, client);
    if (done.result.isError) {
      await forgetFailed();
      return done.result;
    }
    if (done.activity) await recordActivity(deps, name, client, done.activity);
    return done.result;
  } catch (error) {
    await forgetFailed();
    if (
      error instanceof EditError ||
      error instanceof FolderError ||
      isKnownError(error)
    )
      return {
        content: [{ type: "text", text: mcpErrorText(error.message) }],
        isError: true,
      };
    throw error;
  }
}
