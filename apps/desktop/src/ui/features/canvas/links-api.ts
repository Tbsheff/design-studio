import { routes } from "@design-studio/actions/canvas/routes";
import type { StudioEvent } from "@design-studio/contracts";
import type {
  LinkTriggerKind,
  LinkVisibility,
} from "@design-studio/contracts/link-interaction";
import { emptyLinksFile, LINK_ACTIONS } from "@design-studio/contracts/links";
import type {
  LinkAction,
  LinkMotion,
  LinkSource,
  LinksFile,
  LinkTarget,
  LinkTransition,
  PrototypeLink,
} from "@design-studio/contracts/links";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { useProjectEvents } from "../../platform/events.js";
import { call as callAction } from "../../platform/http.js";

type FrameAction = (typeof LINK_ACTIONS)[number];

const isFrameActionName = (action: LinkAction): action is FrameAction =>
  (LINK_ACTIONS as readonly string[]).includes(action);

const frameAction = (
  action: LinkAction | undefined
): { action?: FrameAction } =>
  action !== undefined && isFrameActionName(action) ? { action } : {};

export interface LinkInteractionChange {
  readonly action?: LinkAction;
  readonly delayMs?: number;
  readonly key?: string;
  readonly linkId: string;
  readonly target?: string;
  readonly toFrame?: string;
  readonly trigger?: LinkTriggerKind;
  readonly url?: string;
  readonly visibility?: LinkVisibility;
}

interface Entry {
  file: LinksFile;
  loaded: boolean;
  loading: boolean;
  requestedAt: number;
}

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
const EMPTY = emptyLinksFile();

function entryOf(projectId: string): Entry {
  let entry = entries.get(projectId);

  if (!entry) {
    entry = { file: EMPTY, loaded: false, loading: false, requestedAt: 0 };
    entries.set(projectId, entry);
  }

  return entry;
}

function setFile(projectId: string, file: LinksFile): void {
  entryOf(projectId).file = file;
  listeners.forEach((listener) => listener());
}

const fetchLinks = async (
  projectId: string,
  entry: ReturnType<typeof entryOf>
): Promise<void> => {
  try {
    const { links } = await callAction(routes.listLinksCanvas, { projectId });
    entry.loaded = true;
    setFile(projectId, links);
  } catch (error: unknown) {
    console.error("[links] load failed", error);
  } finally {
    entry.loading = false;
  }
};

function load(projectId: string): void {
  const entry = entryOf(projectId);

  if (entry.loaded || entry.loading) {
    return;
  }

  entry.loading = true;
  entry.requestedAt = Date.now();
  void fetchLinks(projectId, entry);
}

function receive(event: StudioEvent): void {
  if (event.type !== "links.changed") {
    return;
  }

  const entry = entryOf(event.projectId);

  if (!entry.loaded || event.ts < entry.requestedAt) {
    return;
  }

  setFile(event.projectId, event.links);
}

function writeFile(projectId: string, links: LinksFile): LinksFile {
  setFile(projectId, links);

  return links;
}

const frameRefOf = (target: LinkTarget): string | undefined => {
  if ("back" in target) {
    return "back";
  }

  return "frame" in target ? target.frame : undefined;
};

export const linksApi = {
  add: async (
    projectId: string,
    link: { from: LinkSource; to: LinkTarget; transition: LinkTransition }
  ): Promise<PrototypeLink | null> => {
    const { links, link: saved } = await callAction(routes.createLinkCanvas, {
      fromFrame: link.from.frame,
      projectId,
      selector: link.from.selector,
      ...(link.from.tag ? { tag: link.from.tag } : {}),
      ...(link.from.text ? { text: link.from.text } : {}),
      toFrame: frameRefOf(link.to) ?? "back",
      transition: link.transition,
    });

    setFile(projectId, links);

    return saved;
  },
  keep: async (
    projectId: string,
    ids: string[] | "all",
    motion: LinkMotion = {}
  ) => {
    const { links } = await callAction(routes.applyImplicitLinkCanvas, {
      ...frameAction(motion.action),
      ...(motion.duration === undefined ? {} : { duration: motion.duration }),
      ...(motion.easing ? { easing: motion.easing } : {}),
      ids,
      projectId,
      ...(motion.transition ? { transition: motion.transition } : {}),
    });

    return writeFile(projectId, links);
  },
  remove: async (projectId: string, id: string) => {
    const { links } = await callAction(routes.deleteLinkCanvas, {
      linkId: id,
      projectId,
    });

    return writeFile(projectId, links);
  },
  setInteraction: async (
    projectId: string,
    change: LinkInteractionChange
  ): Promise<PrototypeLink | null> => {
    const { links, link } = await callAction(routes.setLinkInteractionCanvas, {
      ...change,
      projectId,
    });

    setFile(projectId, links);

    return link;
  },
  setStart: async (projectId: string, frame: string) => {
    const { links } = await callAction(routes.setStartLinkCanvas, {
      frame,
      projectId,
    });

    return writeFile(projectId, links);
  },
  update: async (
    projectId: string,
    id: string,
    change: { to?: LinkTarget } & LinkMotion
  ) => {
    const toFrame = change.to ? frameRefOf(change.to) : undefined;

    const { links } = await callAction(routes.updateLinkCanvas, {
      ...frameAction(change.action),
      ...(change.duration === undefined ? {} : { duration: change.duration }),
      ...(change.easing ? { easing: change.easing } : {}),
      linkId: id,
      projectId,
      ...(toFrame ? { toFrame } : {}),
      ...(change.transition ? { transition: change.transition } : {}),
    });

    return writeFile(projectId, links);
  },
};

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useLinks(projectId: string): LinksFile {
  useEffect(() => load(projectId), [projectId]);
  useProjectEvents(projectId, receive);

  return useSyncExternalStore(
    subscribe,
    () => entries.get(projectId)?.file ?? EMPTY
  );
}

const IMPLICIT_DEBOUNCE_MS = 400;

const fetchImplicit = async (
  projectId: string,
  isCurrent: () => boolean,
  setLinks: (links: PrototypeLink[]) => void
): Promise<void> => {
  try {
    const { implicit } = await callAction(routes.listImplicitLinksCanvas, {
      projectId,
    });

    if (isCurrent()) {
      setLinks(implicit);
    }
  } catch (error: unknown) {
    console.error("[links] implicit load failed", error);
  }
};

const REPLAY_SLACK_MS = 1000;

export function useImplicitLinks(
  projectId: string,
  framesKey: string
): PrototypeLink[] {
  const [links, setLinks] = useState<PrototypeLink[]>([]);
  const timer = useRef(0);
  const seq = useRef(0);
  const fetchNow = useRef(() => undefined as void);
  fetchNow.current = () => {
    const at = ++seq.current;
    void fetchImplicit(projectId, () => at === seq.current, setLinks);
  };

  const later = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => fetchNow.current(),
      IMPLICIT_DEBOUNCE_MS
    );
  };

  const mountedAt = useRef(Date.now());
  const lastKey = useRef(framesKey);
  useEffect(() => {
    fetchNow.current();

    return () => window.clearTimeout(timer.current);
  }, [projectId]);
  useEffect(() => {
    const before = lastKey.current;
    lastKey.current = framesKey;

    if (before !== "" && before !== framesKey) {
      later();
    }
  }, [framesKey]);
  useProjectEvents(projectId, (event) => {
    if (event.ts < mountedAt.current - REPLAY_SLACK_MS) {
      return;
    }

    if (
      event.type === "files.changed" ||
      event.type === "links.changed" ||
      event.type === "version.created"
    ) {
      later();
    }
  });

  return links;
}
