import { useEffect, useRef } from "react";

import type { DesktopCommand, DesktopContext } from "../../shared/desktop-link";

interface DesktopBridge {
  platform: string;
  version: string;
  onCommand?: (handler: (command: DesktopCommand) => void) => void;
  setContext?: (context: DesktopContext) => void;
  pickFolder?: (options: {
    title: string;
    defaultPath?: string;
  }) => Promise<string | null>;
}

type Handler = (command: DesktopCommand) => boolean;

const handlers: Handler[] = [];
const KEY_ECHO_MS = 400;
const recentKeys = new Map<string, { at: number; handled: () => boolean }>();
const recentCommands = new Map<string, number>();
let installed = false;

const desktopBridge = <
  Bridge extends object = DesktopBridge,
>(): Bridge | null =>
  (globalThis as unknown as { studioDesktop?: Bridge }).studioDesktop ?? null;

const isDesktop = (): boolean => desktopBridge() !== null;

const shortcutName = (event: KeyboardEvent): string | null => {
  if (!(event.metaKey || event.ctrlKey)) {
    return null;
  }

  const key = event.key.toLowerCase();

  if (key === "z") {
    if (event.shiftKey) {
      return "redo";
    }

    return "undo";
  }

  if (key === "enter") {
    return "run";
  }

  if (key === ".") {
    return "stop";
  }

  return null;
};

const dispatchDesktopCommand = (command: DesktopCommand): void => {
  recentCommands.set(command.type, Date.now());
  const pressed = recentKeys.get(command.type);

  if (pressed && pressed.handled() && Date.now() - pressed.at < KEY_ECHO_MS) {
    return;
  }

  for (const handler of [...handlers].toReversed()) {
    if (handler(command)) {
      return;
    }
  }
};

const install = (): void => {
  if (installed) {
    return;
  }

  installed = true;
  globalThis.addEventListener(
    "keydown",
    (event) => {
      const name = shortcutName(event);

      if (name) {
        recentKeys.set(name, {
          at: Date.now(),
          handled: () => event.defaultPrevented,
        });
      }
    },
    true
  );
  desktopBridge()?.onCommand?.(dispatchDesktopCommand);
};

const noteHandledShortcut = (name: "undo" | "redo"): void => {
  recentKeys.set(name, { at: Date.now(), handled: () => true });
};

const recentDesktopCommand = (name: string): boolean => {
  const at = recentCommands.get(name);

  return at !== undefined && Date.now() - at < KEY_ECHO_MS;
};

const useDesktopCommand = (handler: Handler): void => {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    if (!isDesktop()) {
      return;
    }

    install();
    const entry: Handler = (command) => latest.current(command);
    handlers.push(entry);

    return (): void => {
      const index = handlers.indexOf(entry);

      if (index !== -1) {
        handlers.splice(index, 1);
      }
    };
  }, []);
};

const useDesktopContext = (context: DesktopContext, enabled = true): void => {
  const { projectId, directionId, running } = context;
  useEffect(() => {
    if (enabled) {
      desktopBridge()?.setContext?.({ directionId, projectId, running });
    }
  }, [projectId, directionId, running, enabled]);
};

type PickOutcome =
  | { kind: "picked"; path: string }
  | { kind: "canceled" }
  | { kind: "unsupported" };

const hasNativePicker = (): boolean =>
  typeof desktopBridge()?.pickFolder === "function";

const pickFolder = async (options: {
  title: string;
  defaultPath?: string;
}): Promise<PickOutcome> => {
  const native = desktopBridge()?.pickFolder;

  if (!native) {
    return { kind: "unsupported" };
  }

  const chosen = await native({
    title: options.title,
    ...(options.defaultPath ? { defaultPath: options.defaultPath } : {}),
  });

  if (chosen) {
    return { kind: "picked", path: chosen };
  }

  return { kind: "canceled" };
};

export {
  desktopBridge,
  isDesktop,
  noteHandledShortcut,
  recentDesktopCommand,
  useDesktopCommand,
  useDesktopContext,
  hasNativePicker,
  pickFolder,
};
