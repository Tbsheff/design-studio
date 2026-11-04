import type {
  LinkTriggerKind,
  LinkVisibility,
} from "@design-studio/contracts/link-interaction";
import {
  LINK_DELAY_MAX,
  LINK_KEY_RE,
  LINK_TRIGGERS,
  LINK_URL_MAX,
  LINK_VISIBILITIES,
} from "@design-studio/contracts/link-interaction";
import {
  LINK_DURATION_MAX,
  LINK_DURATION_MIN,
  LINK_EASINGS,
  LINK_INTERACTION_ACTIONS,
  LINK_SELECTOR_MAX,
  LINK_TRANSITIONS,
} from "@design-studio/contracts/links";
import type {
  LinkAction,
  LinkEasing,
  LinkTransition,
} from "@design-studio/contracts/links";

import { z } from "../../platform/zod-bridge/index.js";
import { frameRef } from "../tools.js";

interface LinkInteractionRequest {
  readonly action: LinkAction | null;
  readonly delayMs: number | null;
  readonly duration: number | null;
  readonly easing: LinkEasing | null;
  readonly fromFrame: string | null;
  readonly key: string | null;
  readonly linkId: string | null;
  readonly selector: string | null;
  readonly target: string | null;
  readonly toFrame: string | null;
  readonly transition: LinkTransition | null;
  readonly trigger: LinkTriggerKind | null;
  readonly url: string | null;
  readonly visibility: LinkVisibility | null;
}

const LINK_ID_RE = /^l\d{1,5}$/u;

const linkInteractionFields = {
  action: z
    .enum(LINK_INTERACTION_ACTIONS)
    .optional()
    .describe(
      "navigate, modal or drawer go to toFrame; scroll-to scrolls target into view in the same frame; open-url opens url (https only) in a new tab; close-overlay closes the open modal or drawer; toggle shows or hides target."
    ),
  delayMs: z
    .number()
    .int()
    .min(0)
    .max(LINK_DELAY_MAX)
    .optional()
    .describe("Wait in ms for trigger delay."),
  duration: z
    .number()
    .int()
    .min(LINK_DURATION_MIN)
    .max(LINK_DURATION_MAX)
    .optional()
    .describe("Transition length in ms for navigate, modal and drawer."),
  easing: z.enum(LINK_EASINGS).optional().describe("Transition easing."),
  fromFrame: frameRef
    .optional()
    .describe("Frame id or @label of the frame that has the element."),
  key: z
    .string()
    .regex(LINK_KEY_RE)
    .optional()
    .describe(
      'Key name for trigger key: one character ("k", "/") or a name ("Enter", "Escape", "ArrowRight", "Space").'
    ),
  linkId: z
    .string()
    .regex(LINK_ID_RE)
    .optional()
    .describe(
      'Id of a saved link from list_link_interactions, for example "l2". Leave out to make a link from fromFrame and selector.'
    ),
  selector: z
    .string()
    .trim()
    .min(1)
    .max(LINK_SELECTOR_MAX)
    .optional()
    .describe(
      'CSS selector of the source element, for example "#menu-button". Use "body" for a delay trigger on the whole frame.'
    ),
  target: z
    .string()
    .trim()
    .min(1)
    .max(LINK_SELECTOR_MAX)
    .optional()
    .describe("CSS selector in the same frame for scroll-to and toggle."),
  toFrame: frameRef
    .optional()
    .describe(
      'Frame id or @label for navigate, modal and drawer, or "back" for navigate.'
    ),
  transition: z
    .enum(LINK_TRANSITIONS)
    .optional()
    .describe("Transition for navigate, modal and drawer."),
  trigger: z
    .enum(LINK_TRIGGERS)
    .optional()
    .describe(
      "click (default), hover (pointer enters), press (pointer down), delay (delayMs after the frame shows) or key (a key press while the frame shows). One element has one link for each trigger."
    ),
  url: z
    .string()
    .trim()
    .max(LINK_URL_MAX)
    .optional()
    .describe("https URL for open-url."),
  visibility: z
    .enum(LINK_VISIBILITIES)
    .optional()
    .describe("For toggle: toggle (default), show or hide the target."),
};

const listLinkInteractionsFields = {
  fromFrame: frameRef
    .optional()
    .describe("Frame id or @label. Leave out for the links of every frame."),
};

const linkInteractionSchema = z.strictObject(linkInteractionFields);

type LinkInteractionInput = z.output<typeof linkInteractionSchema>;

const toInteractionRequest = (
  input: LinkInteractionInput
): LinkInteractionRequest => ({
  action: input.action ?? null,
  delayMs: input.delayMs ?? null,
  duration: input.duration ?? null,
  easing: input.easing ?? null,
  fromFrame: input.fromFrame ?? null,
  key: input.key ?? null,
  linkId: input.linkId ?? null,
  selector: input.selector ?? null,
  target: input.target ?? null,
  toFrame: input.toFrame ?? null,
  transition: input.transition ?? null,
  trigger: input.trigger ?? null,
  url: input.url ?? null,
  visibility: input.visibility ?? null,
});

export {
  linkInteractionFields,
  linkInteractionSchema,
  listLinkInteractionsFields,
  toInteractionRequest,
};

export type { LinkInteractionInput, LinkInteractionRequest };
