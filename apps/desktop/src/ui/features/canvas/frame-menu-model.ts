import {
  toShareFrameKey,
  toShareFrameUrl,
} from "@design-studio/contracts/share";
import { usePopover } from "@design-studio/ui";
import { useCallback, useMemo, useRef, useState } from "react";
import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  RefObject,
  SetStateAction,
} from "react";

import { COPY_PNG_EVENT } from "../../domain/copy-png-events.js";
import {
  SCREEN_CREATE_EVENT,
  SCREEN_DUPLICATE_EVENT,
} from "../../domain/screen-events.js";
import { TIDY_FRAMES_EVENT } from "../../domain/tidy-frames-events.js";
import { useLive } from "../../platform/live-store.js";
import { prototypeSource } from "../../platform/prototype-dialog.js";
import { openRoutePrototype } from "../../platform/prototype-route.js";
import { copy } from "./copy.js";
import { requestFrameFit } from "./frame-fit-model.js";
import { toMenuItems } from "./menu-items-model.js";

const FRAME_SELECTOR = "[data-frame-id]";

interface FrameMenu {
  readonly close: (refocus: boolean) => void;
  readonly open: boolean;
  readonly root: RefObject<HTMLDivElement | null>;
  readonly setOpen: Dispatch<SetStateAction<boolean>>;
  readonly trigger: RefObject<HTMLButtonElement | null>;
}

const toMenuStep = (
  key: string,
  index: number,
  count: number
): number | null => {
  if (key === "ArrowDown") {
    return (index + 1) % count;
  }

  if (key === "ArrowUp") {
    return (index - 1 + count) % count;
  }

  if (key === "End") {
    return count - 1;
  }

  if (key === "Home") {
    return 0;
  }

  return null;
};

const MENU_ROLE = '[role="menu"]';

const toRootMenuItems = (root: HTMLElement): HTMLButtonElement[] => {
  const items = toMenuItems(root);
  const menu = items[0]?.closest(MENU_ROLE) ?? null;

  return items.filter((item) => item.closest(MENU_ROLE) === menu);
};

const menuKeys = (
  event: ReactKeyboardEvent<HTMLElement>,
  close: (refocus: boolean) => void
): void => {
  if (event.key === "Tab") {
    close(false);
  }

  const items = toRootMenuItems(event.currentTarget);
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  const target = toMenuStep(event.key, Math.max(0, index), items.length);

  if (target === null) {
    return;
  }

  event.preventDefault();
  items[target]?.focus();
};

const useMenu = (): FrameMenu => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);

    if (refocus) {
      trigger.current?.focus();
    }
  }, []);

  usePopover(open, root, close);

  return { close, open, root, setOpen, trigger };
};

interface ScreenEntry {
  readonly icon: "copy";
  readonly id: string;
  readonly label: string;
  readonly run: () => void;
}

const useScreenEntry = (root: RefObject<HTMLElement | null>): ScreenEntry => {
  const run = useCallback((): void => {
    const frame = root.current?.closest<HTMLElement>(FRAME_SELECTOR) ?? null;

    globalThis.dispatchEvent(
      new CustomEvent(SCREEN_DUPLICATE_EVENT, {
        detail: { frameId: frame?.dataset.frameId ?? null },
      })
    );
  }, [root]);

  return useMemo(
    () => ({
      icon: "copy",
      id: "duplicate-screen",
      label: "Duplicate screen…",
      run,
    }),
    [run]
  );
};

const useCopyPngEntry = (root: RefObject<HTMLElement | null>): ScreenEntry => {
  const run = useCallback((): void => {
    const frame = root.current?.closest<HTMLElement>(FRAME_SELECTOR) ?? null;

    globalThis.dispatchEvent(
      new CustomEvent(COPY_PNG_EVENT, {
        detail: { frameId: frame?.dataset.frameId ?? null },
      })
    );
  }, [root]);

  return useMemo(
    () => ({
      icon: "copy",
      id: "copy-png",
      label: copy.copyAsPng,
      run,
    }),
    [run]
  );
};

interface TidyEntry {
  readonly icon: "frame";
  readonly id: string;
  readonly label: string;
  readonly run: () => void;
}

const useTidyEntry = (root: RefObject<HTMLElement | null>): TidyEntry => {
  const run = useCallback((): void => {
    const frame = root.current?.closest<HTMLElement>(FRAME_SELECTOR) ?? null;

    globalThis.dispatchEvent(
      new CustomEvent(TIDY_FRAMES_EVENT, {
        detail: { frameId: frame?.dataset.frameId ?? null },
      })
    );
  }, [root]);

  return useMemo(
    () => ({
      icon: "frame",
      id: "tidy-frames",
      label: copy.tidyUpFrames,
      run,
    }),
    [run]
  );
};

const useFitEntry = (root: RefObject<HTMLElement | null>): TidyEntry => {
  const run = useCallback((): void => {
    const frame = root.current?.closest<HTMLElement>(FRAME_SELECTOR) ?? null;
    const frameId = frame?.dataset.frameId ?? null;

    if (frameId !== null) {
      requestFrameFit([frameId]);
    }
  }, [root]);

  return useMemo(
    () => ({
      icon: "frame",
      id: "fit-frame",
      label: copy.resizeToFit,
      run,
    }),
    [run]
  );
};

interface RedesignEntry {
  readonly icon: "sparkle";
  readonly id: string;
  readonly label: string;
  readonly run: () => void;
}

const toRoutePath = (path: string | null): string =>
  `/${(path ?? "").replace(/^\/+/u, "")}`;

const useRedesignEntry = (path: string | null): RedesignEntry | null => {
  const appProjectId = useLive(prototypeSource);

  const run = useCallback((): void => {
    if (appProjectId !== null) {
      openRoutePrototype(appProjectId, toRoutePath(path));
    }
  }, [appProjectId, path]);

  return useMemo(() => {
    if (appProjectId === null) {
      return null;
    }

    return {
      icon: "sparkle",
      id: "redesign-prototype",
      label: copy.redesignAsPrototype,
      run,
    };
  }, [appProjectId, run]);
};

interface FrameShareLink {
  readonly active: boolean;
  readonly frames: readonly { readonly id?: string }[];
  readonly id: string;
}

interface FrameShareLookup {
  readonly frameId: string;
  readonly links: readonly FrameShareLink[];
  readonly localUrl: string | null;
  readonly tokens: ReadonlyMap<string, string>;
}

const toLinkFrameUrl = (
  link: FrameShareLink,
  lookup: FrameShareLookup,
  base: string
): string | null => {
  const index = link.frames.findIndex((frame) => frame.id === lookup.frameId);
  const token = lookup.tokens.get(link.id) ?? null;
  const frame = link.frames[index];

  if (!link.active || !frame || token === null) {
    return null;
  }

  return toShareFrameUrl(base, token, toShareFrameKey(frame, index));
};

const toFrameShareUrl = (lookup: FrameShareLookup): string | null => {
  const base = lookup.localUrl;

  if (base === null) {
    return null;
  }

  for (const link of lookup.links) {
    const url = toLinkFrameUrl(link, lookup, base);

    if (url !== null) {
      return url;
    }
  }

  return null;
};

const toShareLinkEntry = (
  url: string | null,
  run: () => void
): ScreenEntry | null => {
  if (url === null) {
    return null;
  }

  return {
    icon: "copy",
    id: "copy-share-link",
    label: copy.copyShareLinkToThisFrame,
    run,
  };
};

const openScreenCreate = (): void => {
  globalThis.dispatchEvent(new CustomEvent(SCREEN_CREATE_EVENT));
};

export {
  menuKeys,
  openScreenCreate,
  toFrameShareUrl,
  toRootMenuItems,
  toShareLinkEntry,
  useCopyPngEntry,
  useFitEntry,
  useMenu,
  useRedesignEntry,
  useScreenEntry,
  useTidyEntry,
};

export type {
  FrameMenu,
  FrameShareLink,
  FrameShareLookup,
  RedesignEntry,
  ScreenEntry,
  TidyEntry,
};
