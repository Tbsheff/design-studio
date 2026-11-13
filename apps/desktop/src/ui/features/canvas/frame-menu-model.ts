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

const menuKeys = (
  event: ReactKeyboardEvent<HTMLElement>,
  close: (refocus: boolean) => void
): void => {
  if (event.key === "Tab") {
    close(false);
  }

  const items = toMenuItems(event.currentTarget);
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

const openScreenCreate = (): void => {
  globalThis.dispatchEvent(new CustomEvent(SCREEN_CREATE_EVENT));
};

export {
  menuKeys,
  openScreenCreate,
  useCopyPngEntry,
  useMenu,
  useRedesignEntry,
  useScreenEntry,
  useTidyEntry,
};

export type { RedesignEntry, ScreenEntry, TidyEntry };
