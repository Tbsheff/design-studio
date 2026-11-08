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
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useProjectEvents } from "../../platform/events.js";
import { call as callAction } from "../../platform/http.js";
import type { RouteInput } from "../../platform/http.js";

type FrameAction = (typeof LINK_ACTIONS)[number];

const isFrameActionName = (action: LinkAction): action is FrameAction =>
  (LINK_ACTIONS as readonly string[]).includes(action);

type Writable<Value> = { -readonly [Key in keyof Value]: Value[Key] };

interface MotionFields {
  action?: FrameAction;
  duration?: number;
  easing?: NonNullable<LinkMotion["easing"]>;
  transition?: LinkTransition;
}

const toMotionFields = (motion: LinkMotion): MotionFields => {
  const fields: MotionFields = {};

  if (motion.action && isFrameActionName(motion.action)) {
    fields.action = motion.action;
  }

  const duration = motion.duration ?? null;

  if (duration !== null) {
    fields.duration = duration;
  }

  if (motion.easing) {
    fields.easing = motion.easing;
  }

  if (motion.transition) {
    fields.transition = motion.transition;
  }

  return fields;
};

interface LinkInteractionChange {
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

const entryOf = (projectId: string): Entry => {
  let entry = entries.get(projectId);

  if (!entry) {
    entry = { file: EMPTY, loaded: false, loading: false, requestedAt: 0 };
    entries.set(projectId, entry);
  }

  return entry;
};

const setFile = (projectId: string, file: LinksFile): void => {
  entryOf(projectId).file = file;

  for (const listener of listeners) {
    listener();
  }
};

const fetchLinks = async (
  projectId: string,
  entry: ReturnType<typeof entryOf>
): Promise<void> => {
  try {
    const { links } = await callAction(routes.listLinksCanvas, { projectId });
    entry.loaded = true;
    setFile(projectId, links);
  } catch (error: unknown) {
    reportError(error);
  } finally {
    entry.loading = false;
  }
};

const load = (projectId: string): void => {
  const entry = entryOf(projectId);

  if (entry.loaded || entry.loading) {
    return;
  }

  entry.loading = true;
  entry.requestedAt = Date.now();
  void fetchLinks(projectId, entry);
};

const receive = (event: StudioEvent): void => {
  if (event.type !== "links.changed") {
    return;
  }

  const entry = entryOf(event.projectId);

  if (!entry.loaded || event.ts < entry.requestedAt) {
    return;
  }

  setFile(event.projectId, event.links);
};

const writeFile = (projectId: string, links: LinksFile): LinksFile => {
  setFile(projectId, links);

  return links;
};

const frameRefOf = (target: LinkTarget): string | null => {
  if ("back" in target) {
    return "back";
  }

  if ("frame" in target) {
    return target.frame;
  }

  return null;
};

const linksApi = {
  add: async (
    projectId: string,
    link: { from: LinkSource; to: LinkTarget; transition: LinkTransition }
  ): Promise<PrototypeLink | null> => {
    const owner = projectId;

    const input: Writable<RouteInput<typeof routes.createLinkCanvas>> = {
      fromFrame: link.from.frame,
      projectId: owner,
      selector: link.from.selector,
      toFrame: frameRefOf(link.to) ?? "back",
      transition: link.transition,
    };

    if (link.from.tag) {
      input.tag = link.from.tag;
    }

    if (link.from.text) {
      input.text = link.from.text;
    }

    const { links, link: saved } = await callAction(
      routes.createLinkCanvas,
      input
    );

    setFile(projectId, links);

    return saved;
  },
  keep: async (
    projectId: string,
    ids: string[] | "all",
    motion: LinkMotion = {}
  ): Promise<LinksFile> => {
    const { links } = await callAction(routes.applyImplicitLinkCanvas, {
      ...toMotionFields(motion),
      ids,
      projectId,
    });

    return writeFile(projectId, links);
  },
  remove: async (projectId: string, id: string): Promise<LinksFile> => {
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
  setStart: async (projectId: string, frame: string): Promise<LinksFile> => {
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
  ): Promise<LinksFile> => {
    const input: Writable<RouteInput<typeof routes.updateLinkCanvas>> = {
      linkId: id,
      projectId,
      ...toMotionFields(change),
    };

    if (change.to) {
      const toFrame = frameRefOf(change.to);

      if (toFrame) {
        input.toFrame = toFrame;
      }
    }

    const { links } = await callAction(routes.updateLinkCanvas, input);

    return writeFile(projectId, links);
  },
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const useLinks = (projectId: string): LinksFile => {
  useEffect(() => load(projectId), [projectId]);
  useProjectEvents(projectId, receive);

  return useSyncExternalStore(
    subscribe,
    () => entries.get(projectId)?.file ?? EMPTY
  );
};

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
    reportError(error);
  }
};

const REPLAY_SLACK_MS = 1000;

const useImplicitLinks = (
  projectId: string,
  framesKey: string
): PrototypeLink[] => {
  const [links, setLinks] = useState<PrototypeLink[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const fetchNow = useCallback((): void => {
    seq.current += 1;
    const at = seq.current;
    void fetchImplicit(projectId, () => at === seq.current, setLinks);
  }, [projectId]);

  const later = useCallback((): void => {
    if (timer.current !== null) {
      globalThis.clearTimeout(timer.current);
    }

    timer.current = globalThis.setTimeout(fetchNow, IMPLICIT_DEBOUNCE_MS);
  }, [fetchNow]);

  const mountedAt = useRef(0);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);
  const lastKey = useRef(framesKey);
  useEffect(() => {
    fetchNow();

    return (): void => {
      if (timer.current !== null) {
        globalThis.clearTimeout(timer.current);
      }
    };
  }, [fetchNow]);
  useEffect(() => {
    const before = lastKey.current;
    lastKey.current = framesKey;

    if (before !== "" && before !== framesKey) {
      later();
    }
  }, [framesKey, later]);
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
};

export { linksApi, useImplicitLinks, useLinks };

export type { LinkInteractionChange };
