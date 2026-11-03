import { firstVersionBlock } from "../app/first-version.js";
import { takeSaveFailures } from "../direct-edit/save-queue.js";
import {
  renderedSince,
  renderPending,
  renderSettled,
} from "../events/index.js";
import { withCallOrigin } from "../platform/call-origin/index.js";
import { isKnownError } from "../platform/errors/index.js";
import { EditError } from "./edit-guards.js";
import type { EditDeps } from "./edit-guards.js";
import { callEditTool, EDIT_TOOLS, RENDER_WAIT_TOOLS } from "./edit-tools.js";
import { withLayerSelectors } from "./layer-tools.js";

function argsOf(raw: unknown): Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

const TAKES_PATH = new Set(
  EDIT_TOOLS.flatMap((tool) =>
    "path" in
    ((tool.inputSchema as { properties?: Record<string, unknown> })
      .properties ?? {})
      ? [tool.name]
      : []
  )
);

function splitWait(
  name: string,
  raw: unknown
): { args: Record<string, unknown>; wait: boolean } {
  const { wait, ...args } = argsOf(raw);
  if (!RENDER_WAIT_TOOLS.has(name) || wait === undefined)
    return { args: argsOf(raw), wait: false };
  if (wait !== "render")
    throw new EditError('wait must be "render" or left out.');
  return { args, wait: true };
}

async function withRender(
  result: unknown,
  projectId: unknown,
  started: number
): Promise<unknown> {
  const id = typeof projectId === "string" ? projectId : undefined;
  const waited =
    id !== undefined && (renderPending(id) || renderedSince(id, started));
  const settled = await renderSettled(id);
  const content = (result as { content?: unknown[] }).content;
  if (!Array.isArray(content)) return result;
  const note = waited
    ? settled
      ? `The dev server rebuilt the page ${Date.now() - started} ms after the call started.`
      : "The dev server did not finish the rebuild within 60 s."
    : "No page of this app was rendered yet, so there was no rebuild to wait for.";
  return {
    ...(result as object),
    content: [...content, { type: "text", text: note }],
  };
}

const FIRST_VERSION_WAIT_MS = 20_000;

function withSaveFailures(result: unknown, projectId: unknown): unknown {
  const notes =
    typeof projectId === "string" ? takeSaveFailures(projectId) : [];
  const content = (result as { content?: unknown[] }).content;
  if (notes.length === 0 || !Array.isArray(content)) return result;
  return {
    ...(result as object),
    content: [
      ...content,
      {
        type: "text",
        text: `Error: an earlier edit could not be saved as a version. ${notes.join(" ")}`,
      },
    ],
  };
}

async function firstVersionRefusal(
  edits: EditDeps,
  name: string,
  projectId: unknown
): Promise<string | null> {
  if (!RENDER_WAIT_TOOLS.has(name) || typeof projectId !== "string")
    return null;
  const project = await edits.projects.get(projectId).catch(() => null);
  return project ? firstVersionBlock(project, FIRST_VERSION_WAIT_MS) : null;
}

function lockOnly(name: string, args: Record<string, unknown>): boolean {
  return (
    name === "set_layer_state" &&
    args.hidden === undefined &&
    args.name === undefined
  );
}

async function runEdit(
  edits: EditDeps,
  name: string,
  raw: unknown,
  client: string
): Promise<unknown> {
  try {
    const started = Date.now();
    const { args, wait } = splitWait(name, raw);
    const blocked = await firstVersionRefusal(edits, name, args.projectId);
    if (blocked)
      return { content: [{ type: "text", text: blocked }], isError: true };
    const result = await withCallOrigin(client, async () =>
      callEditTool(
        edits,
        name,
        await withLayerSelectors(
          edits,
          args,
          TAKES_PATH.has(name),
          lockOnly(name, args)
        ),
        client
      )
    );
    const failed = (result as { isError?: boolean }).isError === true;
    const done =
      wait && !failed
        ? await withRender(result, args.projectId, started)
        : result;
    return withSaveFailures(done, args.projectId);
  } catch (error) {
    const known = error instanceof EditError || isKnownError(error);
    if (!known) console.error("[mcp] edit tool failed", name, error);
    return {
      content: [
        {
          type: "text",
          text: known
            ? (error as Error).message
            : "The tool failed. See the Design Studio log.",
        },
      ],
      isError: true,
    };
  }
}

export { argsOf, runEdit };
