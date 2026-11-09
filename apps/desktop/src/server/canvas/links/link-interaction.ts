import type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";
import { triggerOf } from "@design-studio/contracts/link-interaction";
import type {
  LinkTrigger,
  LinkTriggerKind,
} from "@design-studio/contracts/link-interaction";
import {
  cleanLinkSelector,
  cleanLinkText,
  interactionKey,
  linkAction,
  startFrameOf,
  staticLinkIssue,
  upsertLink,
  withMotion,
} from "@design-studio/contracts/links";
import type {
  LinkAction,
  LinkMotion,
  LinkSource,
  LinkTarget,
  LinksFile,
  PrototypeLink,
} from "@design-studio/contracts/links";

import type { CanvasToolContext, ToolText } from "../tools.js";
import type { LinkInteractionRequest } from "./link-interaction-input.js";
import { resolveTarget } from "./link-target.js";
import {
  LinkError,
  describeLink,
  failure,
  frameOf,
  framesOf,
  linkTitle,
  savedLinkText,
} from "./link-tools.js";
import type { LinkProbe } from "./link-tools.js";

interface LinkInteractionDone {
  readonly link: PrototypeLink | null;
  readonly result: ToolText;
  readonly title: string | null;
}

interface Resolved {
  readonly link: Omit<PrototypeLink, "id">;
  readonly linkId: string | null;
}

interface Located {
  readonly current: PrototypeLink | null;
  readonly from: LinkSource;
}

interface Saved {
  readonly file: LinksFile;
  readonly link: PrototypeLink;
}

const TRIGGER_NEEDS = {
  delay: "trigger delay needs delayMs.",
  hover: "trigger hover is not valid here.",
  key: "trigger key needs key, a key name.",
  press: "trigger press is not valid here.",
  "swipe-down": "trigger swipe-down is not valid here.",
  "swipe-left": "trigger swipe-left is not valid here.",
  "swipe-right": "trigger swipe-right is not valid here.",
  "swipe-up": "trigger swipe-up is not valid here.",
} satisfies Record<Exclude<LinkTriggerKind, "click">, string>;

const refusal = (ctx: CanvasToolContext): ToolText | null => {
  if (ctx.plan) {
    return failure(
      "Plan mode is on, so the links stay as they are. Describe the links in the plan."
    );
  }

  if (ctx.mode === "critique") {
    return failure("Links are not available in critique runs.");
  }

  return null;
};

const currentDelay = (current: LinkTrigger | null): number | null => {
  if (current?.kind === "delay") {
    return current.ms;
  }

  return null;
};

const currentKey = (current: LinkTrigger | null): string | null => {
  if (current?.kind === "key") {
    return current.key;
  }

  return null;
};

const resolveTrigger = (
  request: LinkInteractionRequest,
  current: LinkTrigger | null
): LinkTrigger | null => {
  const kind = request.trigger ?? current?.kind ?? "click";

  if (kind === "click") {
    return null;
  }

  const trigger = triggerOf(
    kind,
    request.delayMs ?? currentDelay(current),
    request.key ?? currentKey(current)
  );

  if (!trigger) {
    throw new LinkError(TRIGGER_NEEDS[kind]);
  }

  return trigger;
};

const probeSource = async (
  probe: LinkProbe | null,
  frame: CanvasFileFrame,
  selector: string
): Promise<Pick<LinkSource, "tag" | "text">> => {
  if (!probe) {
    return {};
  }

  const where = frame.path || "the entry page";
  let found: Awaited<ReturnType<LinkProbe>>[number] = null;

  try {
    const probed = await probe(frame, [{ id: "new", selector }]);

    found = probed[0] ?? null;
  } catch {
    throw new LinkError(`Could not render ${where} to check the selector.`);
  }

  if (!found) {
    throw new LinkError(
      `No element matches ${selector} on ${where} of ${frame.id}. Check the selector with get_frame_html.`
    );
  }

  const label = cleanLinkText(found.text);

  if (label) {
    return { tag: found.tag, text: label };
  }

  return { tag: found.tag };
};

const savedLink = (file: LinksFile, linkId: string): PrototypeLink => {
  const current = file.links.find((link) => link.id === linkId);

  if (!current) {
    throw new LinkError(
      `No link ${linkId}. Call list_link_interactions for the ids.`
    );
  }

  return current;
};

const locate = async (
  request: LinkInteractionRequest,
  frames: readonly CanvasFileFrame[],
  file: LinksFile,
  probe: LinkProbe | null
): Promise<Located> => {
  if (request.linkId !== null) {
    const current = savedLink(file, request.linkId);

    return { current, from: current.from };
  }

  if (request.fromFrame === null || request.selector === null) {
    throw new LinkError("Pass linkId, or fromFrame and selector.");
  }

  const frame = frameOf([...frames], request.fromFrame);
  const selector = cleanLinkSelector(request.selector);

  if (!selector) {
    throw new LinkError("selector is empty or too long.");
  }

  const hint = await probeSource(probe, frame, selector);

  return {
    current: null,
    from: { frame: frame.id, path: frame.path ?? "", selector, ...hint },
  };
};

const motionOf = (
  request: LinkInteractionRequest,
  action: LinkAction
): LinkMotion => {
  const motion: LinkMotion = { action };

  if (request.duration !== null) {
    motion.duration = request.duration;
  }

  if (request.easing !== null) {
    motion.easing = request.easing;
  }

  return motion;
};

const baseLink = (
  located: Located,
  target: LinkTarget,
  request: LinkInteractionRequest
): Omit<PrototypeLink, "id"> => {
  const { current } = located;

  const link: Omit<PrototypeLink, "id"> = {
    from: located.from,
    to: target,
    transition: request.transition ?? current?.transition ?? "instant",
  };

  if (current?.duration) {
    link.duration = current.duration;
  }

  if (current?.easing) {
    link.easing = current.easing;
  }

  return link;
};

const resolve = async (
  ctx: CanvasToolContext,
  request: LinkInteractionRequest,
  frames: readonly CanvasFileFrame[],
  probe: LinkProbe | null
): Promise<Resolved> => {
  const file = await ctx.canvas.links.read(ctx.project);
  const located = await locate(request, frames, file, probe);
  const { current } = located;
  let action: LinkAction = request.action ?? "navigate";

  if (current && !request.action) {
    action = linkAction(current);
  }

  const target = resolveTarget(request, {
    action,
    frames,
    previous: current?.to ?? null,
    source: located.from,
  });

  const link = withMotion(
    baseLink(located, target, request),
    motionOf(request, action)
  );

  const trigger = resolveTrigger(request, current?.trigger ?? null);

  if (trigger) {
    link.trigger = trigger;
  }

  return { link, linkId: current?.id ?? null };
};

const applyChange = (file: LinksFile, resolved: Resolved): Saved => {
  if (resolved.linkId === null) {
    return upsertLink(file, resolved.link);
  }

  const id = resolved.linkId;
  const link: PrototypeLink = { ...resolved.link, id };
  const key = interactionKey(link);
  const links: PrototypeLink[] = [];

  for (const item of file.links) {
    if (item.id === id) {
      links.push(link);
    }

    if (item.id !== id && interactionKey(item) !== key) {
      links.push(item);
    }
  }

  return { file: { ...file, links }, link };
};

const writeChange = async (
  ctx: CanvasToolContext,
  resolved: Resolved
): Promise<Saved> => {
  let saved: PrototypeLink | null = null;

  const file = await ctx.canvas.links.update(
    ctx.project,
    (current) => {
      const stale =
        resolved.linkId !== null &&
        !current.links.some((link) => link.id === resolved.linkId);

      if (stale) {
        return null;
      }

      const next = applyChange(current, resolved);

      saved = next.link;

      return next.file;
    },
    "agent"
  );

  const link = saved as PrototypeLink | null;

  if (!link) {
    throw new LinkError("The link was not saved.");
  }

  return { file, link };
};

const runSet = async (
  ctx: CanvasToolContext,
  request: LinkInteractionRequest,
  probe: LinkProbe | null
): Promise<LinkInteractionDone> => {
  const frames = await framesOf(ctx);
  const resolved = await resolve(ctx, request, frames, probe);
  const { file, link } = await writeChange(ctx, resolved);

  return {
    link,
    result: savedLinkText(link, frames, file),
    title: linkTitle(link, frames),
  };
};

const setLinkInteraction = async (
  ctx: CanvasToolContext,
  request: LinkInteractionRequest,
  probe: LinkProbe | null
): Promise<LinkInteractionDone> => {
  const refused = refusal(ctx);

  if (refused) {
    return { link: null, result: refused, title: null };
  }

  try {
    return await runSet(ctx, request, probe);
  } catch (error) {
    if (error instanceof LinkError) {
      return { link: null, result: failure(error.message), title: null };
    }

    throw error;
  }
};

interface LinkInteractionListing {
  readonly file: LinksFile;
  readonly items: ReturnType<typeof describeLink>[];
  readonly note: string;
  readonly startFrame: string;
}

const listLinkInteractions = async (
  ctx: CanvasToolContext,
  fromFrame: string | null
): Promise<LinkInteractionListing> => {
  const [frames, file] = await Promise.all([
    framesOf(ctx),
    ctx.canvas.links.read(ctx.project),
  ]);

  let { links } = file;

  if (fromFrame !== null) {
    const only = frameOf(frames, fromFrame).id;

    links = links.filter((link) => link.from.frame === only);
  }

  let note =
    "trigger is click when it is not shown. Implicit links from page code are in list_links.";

  if (links.length === 0) {
    note = "No saved links. set_link_interaction makes one.";
  }

  const startFrame = startFrameOf(file, frames);

  const items = links.map((link) =>
    describeLink(link, frames, staticLinkIssue(link, frames), startFrame)
  );

  return { file, items, note, startFrame };
};

export { listLinkInteractions, setLinkInteraction };

export type { LinkInteractionDone, LinkInteractionListing };
