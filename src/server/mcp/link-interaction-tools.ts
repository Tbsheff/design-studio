import { z } from "zod";

import {
  linkInteractionFields,
  listLinkInteractionsFields,
  toInteractionRequest,
} from "../canvas/links/link-interaction-input.js";
import {
  listLinkInteractions,
  setLinkInteraction,
} from "../canvas/links/link-interaction.js";
import { probeWithPreview } from "../canvas/links/link-tools.js";
import type { CanvasToolContext } from "../canvas/tools.js";
import { loadTarget, refuseWhileRunning } from "./edit-deps.js";
import type { EditDeps } from "./edit-deps.js";
import {
  defineTool,
  directionId as directionIdSchema,
  plain,
  projectId as projectIdSchema,
} from "./edit-kit.js";
import type { Done } from "./edit-kit.js";

const INTERACTION_NOTE =
  "Links live in the studio (.studio/links.json), not in the page code. Each change is one step in the edit history (undo and redo) and saves with the next version.";

const listSchema = z.strictObject({
  directionId: directionIdSchema,
  projectId: projectIdSchema,
  ...listLinkInteractionsFields,
});

const setSchema = z.strictObject({
  directionId: directionIdSchema,
  projectId: projectIdSchema,
  ...linkInteractionFields,
});

type ListInput = z.output<typeof listSchema>;

type SetInput = z.output<typeof setSchema>;

const canvasScope = async (
  deps: EditDeps,
  input: { readonly directionId?: string; readonly projectId: string },
  isEdit: boolean
): Promise<CanvasToolContext> => {
  const found = await loadTarget(deps, input.projectId, input.directionId);

  if (isEdit) {
    refuseWhileRunning(deps, found.project, found.direction);
  }

  return {
    canvas: deps.canvas,
    direction: found.direction,
    mode: "edit",
    plan: false,
    project: found.project,
  };
};

const runList = async (deps: EditDeps, input: ListInput): Promise<Done> => {
  const ctx = await canvasScope(deps, input, false);

  return plain(await listLinkInteractions(ctx, input.fromFrame ?? null));
};

const runSet = async (deps: EditDeps, input: SetInput): Promise<Done> => {
  const ctx = await canvasScope(deps, input, true);

  const probe = probeWithPreview(
    deps.preview,
    ctx.project,
    ctx.direction,
    deps.frameStates
  );

  const done = await setLinkInteraction(
    ctx,
    toInteractionRequest(input),
    probe ?? null
  );

  if (done.result.isError || !done.link) {
    return plain(done.result);
  }

  return {
    activity: {
      directionId: ctx.direction.id,
      frameId: done.link.from.frame,
      projectId: ctx.project.id,
      summary: `Set prototype link interaction ${done.title ?? done.link.id}`,
    },
    result: done.result,
  };
};

const listLinkInteractionsTool = defineTool(
  "list_link_interactions",
  listSchema,
  {
    description: `List the saved prototype links with their trigger (click, hover, press, delay with delayMs, key with key), action (navigate, modal, drawer, scroll-to, open-url, close-overlay, toggle), target (toFrame, a target selector with visibility, or url) and broken (null, or why the link no longer works). Read only. ${INTERACTION_NOTE}`,
    idempotent: true,
    readOnly: true,
    title: "List prototype link interactions",
  },
  runList
);

const setLinkInteractionTool = defineTool(
  "set_link_interaction",
  setSchema,
  {
    description: `Set the trigger, action and target of one prototype link (linkId), or make a link from a source element (fromFrame and selector). trigger: click (default), hover, press, delay (delayMs) or key (key). action: navigate, modal or drawer (toFrame), scroll-to (target selector in the same frame), open-url (https url), close-overlay, or toggle (target selector, visibility toggle, show or hide). One element has one link per trigger; a second link with the same trigger replaces the first. ${INTERACTION_NOTE}`,
    idempotent: true,
    title: "Set prototype link interaction",
  },
  runSet
);

const LINK_INTERACTION_TOOLS = [
  listLinkInteractionsTool,
  setLinkInteractionTool,
];

export { LINK_INTERACTION_TOOLS };
