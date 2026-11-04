import { withMotion } from "@design-studio/contracts/links";
import type {
  LINK_ACTIONS,
  LinkEasing,
  LinkMotion,
  LinksFile,
  LinkTransition,
  PrototypeLink,
} from "@design-studio/contracts/links";

import { NotFoundError } from "../../platform/errors/index.js";
import type { CanvasToolContext } from "../tools.js";
import { implicitLinks, keepImplicit } from "./implicit-links.js";
import type { LinkRuntime } from "./link-runtime.js";
import {
  frameOf,
  framesOf,
  implicitDeps,
  linkTitle,
  listLinkView,
  probeWithPreview,
  saveLink,
} from "./link-tools.js";
import type { LinkProbe, LinkView } from "./link-tools.js";

interface LinkListQuery {
  readonly check: boolean;
  readonly projectId: string;
}

interface LinkListed {
  readonly items: LinkView["links"];
  readonly links: LinksFile;
  readonly note: string | null;
  readonly startFrame: string;
}

type FrameAction = (typeof LINK_ACTIONS)[number];

interface LinkCreateQuery {
  readonly action?: FrameAction;
  readonly duration?: number;
  readonly easing?: LinkEasing;
  readonly fromFrame: string;
  readonly projectId: string;
  readonly selector: string;
  readonly tag?: string;
  readonly text?: string;
  readonly toFrame: string;
  readonly transition?: LinkTransition;
}

interface LinkUpdateQuery {
  readonly action?: FrameAction;
  readonly duration?: number;
  readonly easing?: LinkEasing;
  readonly linkId: string;
  readonly projectId: string;
  readonly toFrame?: string;
  readonly transition?: LinkTransition;
}

interface LinkKeepQuery {
  readonly action?: FrameAction;
  readonly duration?: number;
  readonly easing?: LinkEasing;
  readonly ids: readonly string[] | "all";
  readonly projectId: string;
  readonly transition?: LinkTransition;
}

interface LinkSaved {
  readonly link: PrototypeLink | null;
  readonly links: LinksFile;
  readonly title: string | null;
}

const SOURCE = "user";

const contextOf = async (
  runtime: LinkRuntime,
  projectId: string
): Promise<CanvasToolContext> => {
  const project = await runtime.projects.get(projectId);

  return {
    canvas: runtime.canvas,
    direction: runtime.canvas.ownerOf(project),
    mode: "edit",
    plan: false,
    project,
  };
};

const probeOf = (
  runtime: LinkRuntime,
  context: CanvasToolContext
): LinkProbe | undefined =>
  runtime.preview
    ? probeWithPreview(
        runtime.preview,
        context.project,
        context.direction,
        runtime.frameStates
      )
    : undefined;

const motionOf = (query: LinkUpdateQuery | LinkKeepQuery): LinkMotion => ({
  ...(query.action ? { action: query.action } : {}),
  ...(query.transition ? { transition: query.transition } : {}),
  ...(query.duration === undefined ? {} : { duration: query.duration }),
  ...(query.easing ? { easing: query.easing } : {}),
});

const readLinkList = async (
  runtime: LinkRuntime,
  query: LinkListQuery
): Promise<LinkListed> => {
  const context = await contextOf(runtime, query.projectId);

  const view = await listLinkView(
    context,
    query.check ? probeOf(runtime, context) : undefined,
    false
  );

  return {
    items: view.links,
    links: await runtime.canvas.links.read(context.project),
    note: view.note ?? null,
    startFrame: view.startFrame,
  };
};

const readImplicitList = async (
  runtime: LinkRuntime,
  projectId: string
): Promise<readonly PrototypeLink[]> => {
  const context = await contextOf(runtime, projectId);

  return implicitLinks(
    implicitDeps(runtime.canvas, context.project, probeOf(runtime, context))
  );
};

const writeCreate = async (
  runtime: LinkRuntime,
  query: LinkCreateQuery
): Promise<LinkSaved> => {
  const context = await contextOf(runtime, query.projectId);

  const given =
    query.tag || query.text
      ? {
          ...(query.tag ? { tag: query.tag } : {}),
          ...(query.text ? { text: query.text } : {}),
        }
      : undefined;

  const { file, frames, link } = await saveLink(
    context,
    {
      ...(query.action ? { action: query.action } : {}),
      ...(query.duration === undefined ? {} : { duration: query.duration }),
      ...(query.easing ? { easing: query.easing } : {}),
      fromFrame: query.fromFrame,
      selector: query.selector,
      toFrame: query.toFrame,
      ...(query.transition ? { transition: query.transition } : {}),
    },
    probeOf(runtime, context),
    SOURCE,
    given
  );

  return { link, links: file, title: linkTitle(link, frames) };
};

const writeUpdate = async (
  runtime: LinkRuntime,
  query: LinkUpdateQuery
): Promise<LinkSaved> => {
  const context = await contextOf(runtime, query.projectId);
  const frames = await framesOf(context);
  let to: PrototypeLink["to"] | null = null;

  if (query.toFrame !== undefined) {
    to =
      query.toFrame.trim().toLowerCase() === "back"
        ? { back: true }
        : { frame: frameOf(frames, query.toFrame).id };
  }

  const motion = motionOf(query);
  let found: PrototypeLink | null = null;

  const links = await runtime.canvas.links.update(
    context.project,
    (file) => {
      found = file.links.find((link) => link.id === query.linkId) ?? null;

      if (!found) {
        return null;
      }

      return {
        ...file,
        links: file.links.map((link) =>
          link.id === query.linkId
            ? withMotion({ ...link, ...(to ? { to } : {}) }, motion)
            : link
        ),
      };
    },
    SOURCE
  );

  if (!found) {
    throw new NotFoundError("link not found");
  }

  const saved = links.links.find((link) => link.id === query.linkId) ?? null;

  return {
    link: saved,
    links,
    title: saved ? linkTitle(saved, frames) : null,
  };
};

const writeDelete = async (
  runtime: LinkRuntime,
  projectId: string,
  linkId: string
): Promise<LinkSaved> => {
  const context = await contextOf(runtime, projectId);
  const frames = await framesOf(context);
  let removed: PrototypeLink | null = null;

  const links = await runtime.canvas.links.update(
    context.project,
    (file) => {
      removed = file.links.find((link) => link.id === linkId) ?? null;

      return removed
        ? { ...file, links: file.links.filter((link) => link.id !== linkId) }
        : null;
    },
    SOURCE
  );

  const gone = removed as PrototypeLink | null;

  if (!gone) {
    throw new NotFoundError("link not found");
  }

  return { link: gone, links, title: linkTitle(gone, frames) };
};

const writeKeep = async (
  runtime: LinkRuntime,
  query: LinkKeepQuery
): Promise<{ kept: readonly PrototypeLink[]; links: LinksFile }> => {
  const context = await contextOf(runtime, query.projectId);

  const done = await keepImplicit(
    implicitDeps(runtime.canvas, context.project, probeOf(runtime, context)),
    query.ids,
    SOURCE,
    motionOf(query)
  );

  if (done.kept.length === 0) {
    throw new NotFoundError("implicit link not found");
  }

  return { kept: done.kept, links: done.file };
};

const writeStart = async (
  runtime: LinkRuntime,
  projectId: string,
  frameRef: string
): Promise<LinksFile> => {
  const context = await contextOf(runtime, projectId);
  const frame = frameOf(await framesOf(context), frameRef);

  return runtime.canvas.links.update(
    context.project,
    (file): LinksFile => ({ ...file, start: frame.id }),
    SOURCE
  );
};

export {
  readImplicitList,
  readLinkList,
  writeCreate,
  writeDelete,
  writeKeep,
  writeStart,
  writeUpdate,
};

export type {
  LinkCreateQuery,
  LinkKeepQuery,
  LinkListed,
  LinkListQuery,
  LinkSaved,
  LinkUpdateQuery,
};
