import { useEffect } from "react";

import type { DesktopCommand, DesktopContext } from "../../shared/desktop-link";
import { useLatest } from "./use-latest.js";

interface PickFolderOptions {
  title: string;
  defaultPath?: string;
}

interface DesktopBridge {
  platform: string;
  version: string;
  onCommand?: (handler: (command: DesktopCommand) => void) => void;
  setContext?: (context: DesktopContext) => void;
  pickFolder?: (options: PickFolderOptions) => Promise<string | null>;
}

type Handler = (command: DesktopCommand) => boolean;

const handlers: Handler[] = [];
const KEY_ECHO_MS = 400;
const recentKeys = new Map<string, { at: number; handled: () => boolean }>();
const recentCommands = new Map<string, number>();
let installed = false;

interface DesktopHost {
  readonly studioDesktop: object | null;
}

const isDesktopHost = (
  host: typeof globalThis
): host is DesktopHost & typeof globalThis => "studioDesktop" in host;

const desktopBridge = <
  Bridge extends object = DesktopBridge,
>(): Bridge | null => {
  const host = globalThis;

  if (!isDesktopHost(host)) {
    return null;
  }

  return (host.studioDesktop ?? null) as Bridge | null;
};

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
  const at = recentCommands.get(name) ?? null;

  return at !== null && Date.now() - at < KEY_ECHO_MS;
};

const useDesktopCommand = (handler: Handler): void => {
  const latest = useLatest(handler);

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
  }, [latest]);
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

const hasNativePicker = (): boolean => Boolean(desktopBridge()?.pickFolder);

const pickFolder = async (options: PickFolderOptions): Promise<PickOutcome> => {
  const native = desktopBridge()?.pickFolder;

  if (!native) {
    return { kind: "unsupported" };
  }

  const request: PickFolderOptions = { title: options.title };

  if (options.defaultPath) {
    request.defaultPath = options.defaultPath;
  }

  const chosen = await native(request);

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
