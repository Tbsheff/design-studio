import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { routes } from "../shared/actions/canvas/routes.js";
import { STUDIO_TOKEN_HEADER, type StudioEvent } from "../shared/contracts";
import type {
  LinkTriggerKind,
  LinkVisibility,
} from "../shared/link-interaction";
import {
  emptyLinksFile,
  type LinkAction,
  type LinkMotion,
  type LinkSource,
  type LinksFile,
  type LinkTarget,
  type LinkTransition,
  type PrototypeLink,
} from "../shared/links";
import { ApiError } from "./api";
import { useProjectEvents } from "./events";
import { call as callAction } from "./platform/http";
import { getSession } from "./session";

async function call<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: {
      [STUDIO_TOKEN_HEADER]: getSession().token,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      error?: string;
      message?: string;
    } | null;

    throw new ApiError(
      res.status,
      data?.message ?? data?.error ?? `${method} ${path} failed: ${res.status}`,
      data?.error
    );
  }

  return (await res.json()) as T;
}

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

const base = (projectId: string) =>
  `/api/projects/${encodeURIComponent(projectId)}/links`;

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

function load(projectId: string): void {
  const entry = entryOf(projectId);

  if (entry.loaded || entry.loading) {
    return;
  }

  entry.loading = true;
  entry.requestedAt = Date.now();
  callAction(routes.listLinksCanvas, { projectId })
    .then(({ links }) => {
      entry.loaded = true;
      setFile(projectId, links as LinksFile);
    })
    .catch((error: unknown) => console.error("[links] load failed", error))
    .finally(() => {
      entry.loading = false;
    });
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

function writeFile(projectId: string, links: unknown): LinksFile {
  setFile(projectId, links as LinksFile);

  return links as LinksFile;
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

    setFile(projectId, links as LinksFile);

    return saved as PrototypeLink | null;
  },
  update: async (
    projectId: string,
    id: string,
    change: { to?: LinkTarget } & LinkMotion
  ) => {
    const toFrame = change.to ? frameRefOf(change.to) : undefined;

    const { links } = await callAction(routes.updateLinkCanvas, {
      ...(change.action ? { action: change.action } : {}),
      ...(change.duration === undefined ? {} : { duration: change.duration }),
      ...(change.easing ? { easing: change.easing } : {}),
      linkId: id,
      projectId,
      ...(toFrame ? { toFrame } : {}),
      ...(change.transition ? { transition: change.transition } : {}),
    });

    return writeFile(projectId, links);
  },
  keep: async (
    projectId: string,
    ids: string[] | "all",
    motion: LinkMotion = {}
  ) => {
    const { links } = await callAction(routes.keepLinkCanvas, {
      ...(motion.action ? { action: motion.action } : {}),
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
    const { links, link } = await call<{
      links: LinksFile;
      link: PrototypeLink | null;
    }>("POST", `${base(projectId)}/interaction`, change);

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
    callAction(routes.listImplicitLinksCanvas, { projectId })
      .then(({ implicit }) => {
        if (at === seq.current) {
          setLinks(implicit as PrototypeLink[]);
        }
      })
      .catch((error: unknown) =>
        console.error("[links] implicit load failed", error)
      );
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
