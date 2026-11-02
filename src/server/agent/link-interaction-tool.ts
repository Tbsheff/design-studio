import {
  linkInteractionFields,
  listLinkInteractionsFields,
  toInteractionRequest,
} from "../canvas/links/link-interaction-input.js";
import type { LinkInteractionInput } from "../canvas/links/link-interaction-input.js";
import {
  listLinkInteractions,
  setLinkInteraction,
} from "../canvas/links/link-interaction.js";
import type { LinkProbe } from "../canvas/links/link-tools.js";
import type { CanvasToolContext, ToolText } from "../canvas/tools.js";

const setLinkInteractionInput = linkInteractionFields;

const listLinkInteractionsInput = listLinkInteractionsFields;

const runSetLinkInteraction = async (
  ctx: CanvasToolContext,
  args: LinkInteractionInput,
  probe: LinkProbe | null
): Promise<ToolText> => {
  const done = await setLinkInteraction(ctx, toInteractionRequest(args), probe);

  return done.result;
};

const runListLinkInteractions = (
  ctx: CanvasToolContext,
  fromFrame: string | null
): Promise<ToolText> => listLinkInteractions(ctx, fromFrame);

export {
  listLinkInteractionsInput,
  runListLinkInteractions,
  runSetLinkInteraction,
  setLinkInteractionInput,
};
