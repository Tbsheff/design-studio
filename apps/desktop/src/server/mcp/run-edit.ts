import { firstVersionBlock } from "../app/first-version.js";
import {
  PENDING_VERSION,
  savedVersionId,
  savesSettled,
  takeSaveFailures,
} from "../direct-edit/commit/index.js";
import {
  renderedSince,
  renderPending,
  renderSettled,
} from "../events/index.js";
import { withCallOrigin } from "../platform/call-origin/index.js";
import { isKnownError } from "../platform/errors/index.js";
import type { ActivityDraft } from "./activity.js";
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

const ACTION_WAIT_TOOLS = new Set([
  ...RENDER_WAIT_TOOLS,
  "redo",
  "revert_hunk",
  "undo",
]);

const isFailure = (result: unknown): boolean =>
  (result as { isError?: boolean }).isError === true;

const toFailure = (text: string): unknown => ({
  content: [{ text, type: "text" }],
  isError: true,
});

const toResultVersionId = (result: unknown): string | null => {
  const blocks = (result as { content?: unknown }).content;

  if (!Array.isArray(blocks)) {
    return null;
  }

  for (const block of blocks as { text?: unknown }[]) {
    if (typeof block.text !== "string") {
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(block.text);
      const id = (parsed as { versionId?: unknown } | null)?.versionId;

      if (typeof id === "string" && id !== "") {
        return id;
      }
    } catch {
      return null;
    }
  }

  return null;
};

const toArgsFrameId = (args: Record<string, unknown>): string | null => {
  if (typeof args.frameId === "string") {
    return args.frameId;
  }

  if (typeof args.frame === "string") {
    return args.frame;
  }

  return null;
};

const toActionActivity = (
  name: string,
  args: Record<string, unknown>,
  result: unknown
): ActivityDraft | null => {
  if (typeof args.projectId !== "string") {
    return null;
  }

  return {
    versionId: toResultVersionId(result),
    directionId: typeof args.directionId === "string" ? args.directionId : null,
    frameId: toArgsFrameId(args),
    projectId: args.projectId,
    summary: `Ran ${name.replaceAll("_", " ")}.`,
  };
};

const toSettledDraft = async (draft: ActivityDraft): Promise<ActivityDraft> => {
  const id = draft.versionId ?? null;

  if (id === null || !id.startsWith(PENDING_VERSION)) {
    return draft;
  }

  await savesSettled(draft.projectId);

  return { ...draft, versionId: savedVersionId(id) };
};

interface ActionEditInput {
  readonly call: (args: Record<string, unknown>) => Promise<unknown>;
  readonly client: string;
  readonly edits: EditDeps;
  readonly name: string;
  readonly raw: unknown;
}

async function runActionEdit(input: ActionEditInput): Promise<unknown> {
  const { call, client, edits, name, raw } = input;

  try {
    const started = Date.now();
    const split = ACTION_WAIT_TOOLS.has(name)
      ? splitWait(name, raw)
      : { args: argsOf(raw), wait: false };
    const { args, wait } = split;
    const blocked = await firstVersionRefusal(edits, name, args.projectId);

    if (blocked) {
      return toFailure(blocked);
    }

    const result = await withCallOrigin(client, async () =>
      call(
        await withLayerSelectors(
          edits,
          args,
          "path" in args,
          lockOnly(name, args)
        )
      )
    );

    if (isFailure(result)) {
      return withSaveFailures(result, args.projectId);
    }

    const draft = toActionActivity(name, args, result);

    if (draft !== null) {
      const settled = await toSettledDraft(draft);

      await edits.activity.record(name, client, settled).catch(() => null);
    }

    const done = wait
      ? await withRender(result, args.projectId, started)
      : result;

    return withSaveFailures(done, args.projectId);
  } catch (error) {
    if (error instanceof EditError || isKnownError(error)) {
      return toFailure((error as Error).message);
    }

    throw error;
  }
}

export { argsOf, runActionEdit, runEdit };
