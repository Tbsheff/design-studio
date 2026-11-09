import type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";
import {
  cleanLinkUrl,
  targetFits,
} from "@design-studio/contracts/link-interaction";
import type { LinkVisibility } from "@design-studio/contracts/link-interaction";
import { cleanVariableSet } from "@design-studio/contracts/link-variable";
import type { LinkVariableSet } from "@design-studio/contracts/link-variable";
import {
  cleanLinkSelector,
  isFrameAction,
} from "@design-studio/contracts/links";
import type {
  LinkAction,
  LinkSource,
  LinkTarget,
} from "@design-studio/contracts/links";

import type { LinkInteractionRequest } from "./link-interaction-input.js";
import { BACK_REF, LinkError, frameOf } from "./link-tools.js";

interface TargetQuery {
  readonly action: LinkAction;
  readonly previous: LinkTarget | null;
  readonly frames: readonly CanvasFileFrame[];
  readonly source: LinkSource;
}

const frameTarget = (
  request: LinkInteractionRequest,
  query: TargetQuery
): LinkTarget | null => {
  if (request.toFrame === null) {
    return null;
  }

  if (request.toFrame.trim().toLowerCase() === BACK_REF) {
    if (query.action !== "navigate") {
      throw new LinkError(
        'A "back" link cannot open an overlay. Use action navigate, or a toFrame.'
      );
    }

    return { back: true };
  }

  const to = frameOf([...query.frames], request.toFrame);

  if (to.id === query.source.frame) {
    throw new LinkError(
      'A link goes to another frame. Pick a different toFrame, or "back".'
    );
  }

  return { frame: to.id };
};

const currentSelector = (current: LinkTarget | null): string | null => {
  if (current && "selector" in current) {
    return current.selector;
  }

  return null;
};

const currentVisibility = (
  current: LinkTarget | null
): LinkVisibility | null => {
  if (current && "selector" in current) {
    return current.visibility ?? null;
  }

  return null;
};

const selectorTarget = (
  request: LinkInteractionRequest,
  query: TargetQuery
): LinkTarget | null => {
  const raw = request.target ?? currentSelector(query.previous);

  if (raw === null) {
    return null;
  }

  const selector = cleanLinkSelector(raw);

  if (!selector) {
    throw new LinkError("target is empty or too long.");
  }

  const visibility = request.visibility ?? currentVisibility(query.previous);

  if (
    query.action === "toggle" &&
    (visibility === "show" || visibility === "hide")
  ) {
    return { selector, visibility };
  }

  return { selector };
};

const urlTarget = (request: LinkInteractionRequest): LinkTarget | null => {
  if (request.url === null) {
    return null;
  }

  const url = cleanLinkUrl(request.url);

  if (!url) {
    throw new LinkError("url must be a full https URL.");
  }

  return { url };
};

const toPreviousVariable = (
  previous: LinkTarget | null
): LinkVariableSet | null => {
  if (previous && "variable" in previous) {
    return previous.variable;
  }

  return null;
};

const toVariableTarget = (
  request: LinkInteractionRequest,
  query: TargetQuery
): LinkTarget | null => {
  const before = toPreviousVariable(query.previous);
  const name = request.variableName ?? before?.name ?? null;

  if (name === null) {
    return null;
  }

  const op = request.variableOp ?? before?.op ?? "set";
  const value = request.variableValue ?? before?.value ?? null;
  const variable = cleanVariableSet(name, op, value);

  if (variable === null) {
    throw new LinkError(
      "set-variable needs variableName (letters and digits), variableOp (set, toggle or add) and variableValue (a string or number; a number for add; none for toggle)."
    );
  }

  return { variable };
};

const nextTarget = (
  request: LinkInteractionRequest,
  query: TargetQuery
): LinkTarget | null => {
  if (query.action === "close-overlay") {
    return { close: true };
  }

  if (isFrameAction(query.action)) {
    return frameTarget(request, query);
  }

  if (query.action === "open-url") {
    return urlTarget(request);
  }

  if (query.action === "set-variable") {
    return toVariableTarget(request, query);
  }

  return selectorTarget(request, query);
};

const missingTarget = (action: LinkAction): string => {
  if (isFrameAction(action)) {
    return `Action ${action} needs toFrame.`;
  }

  if (action === "open-url") {
    return "Action open-url needs url.";
  }

  if (action === "set-variable") {
    return "Action set-variable needs variableName.";
  }

  return `Action ${action} needs target, a CSS selector in the same frame.`;
};

const resolveTarget = (
  request: LinkInteractionRequest,
  query: TargetQuery
): LinkTarget => {
  const next = nextTarget(request, query);

  if (next) {
    return next;
  }

  if (query.previous && targetFits(query.action, query.previous)) {
    return query.previous;
  }

  throw new LinkError(missingTarget(query.action));
};

export { resolveTarget };

export type { TargetQuery };
