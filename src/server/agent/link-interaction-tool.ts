import type { CanvasToolContext, ToolText } from "../canvas/index.js";
import {
  linkInteractionFields,
  listLinkInteractions,
  listLinkInteractionsFields,
  setLinkInteraction,
  toInteractionRequest,
} from "../canvas/links/index.js";
import type { LinkInteractionInput, LinkProbe } from "../canvas/links/index.js";

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
