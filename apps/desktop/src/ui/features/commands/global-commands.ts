import {
  CONNECT_AI_COMMAND,
  openConnectAi,
} from "../../domain/connect-ai-events.js";
import { COPY_PNG_EVENT } from "../../domain/copy-png-events.js";
import { withDisabled } from "./command-disabled.js";
import { copy } from "./copy.js";
import {
  FIND_TEXT_COMMAND,
  FIND_TEXT_EVENT,
  findElement,
  goHome,
  pickFolder,
  requestOpenApp,
  uiStore,
} from "./deps.js";
import { openLayer } from "./registry.js";
import type { Command } from "./registry.js";

const focusNewProject = (): void => {
  globalThis.requestAnimationFrame(() =>
    findElement(document.body, '[aria-label="Describe the design"]')?.focus()
  );
};

const openFolder = async (): Promise<void> => {
  const picked = await pickFolder({ title: "Open a folder" });

  if (picked.kind === "canceled") {
    return;
  }

  goHome();

  if (picked.kind === "picked") {
    requestOpenApp(picked.path);

    return;
  }

  requestOpenApp("");
};

const runOpenFolder = async (): Promise<void> => {
  try {
    await openFolder();
  } catch {
    globalThis.console.debug("open folder failed");
  }
};

type ThemePref = "system" | "light" | "dark";

declare global {
  interface Window {
    studioTheme?: { set: (pref: ThemePref) => void };
  }
}

const setTheme = (pref: ThemePref): void => {
  globalThis.window.studioTheme?.set(pref);
};

const THEME_COMMANDS: Command[] = [
  {
    group: "View",
    icon: "moon",
    id: "theme.system",
    keywords: "appearance auto dark light",
    run: () => setTheme("system"),
    title: "Theme: match the system",
  },
  {
    group: "View",
    icon: "moon",
    id: "theme.light",
    keywords: "appearance",
    run: () => setTheme("light"),
    title: "Theme: light",
  },
  {
    group: "View",
    icon: "moon",
    id: "theme.dark",
    keywords: "appearance night",
    run: () => setTheme("dark"),
    title: "Theme: dark",
  },
];

const runThemeCommand = (id: string): boolean => {
  const command = THEME_COMMANDS.find((entry) => entry.id === id);

  if (!command) {
    return false;
  }

  command.run();

  return true;
};

const toFindTextReason = (inProject: boolean): string | null => {
  if (inProject) {
    return null;
  }

  return "Open a project to find text";
};

const findTextCommand = (inProject: boolean): Command =>
  withDisabled(
    {
      group: "Edit",
      icon: "search",
      id: FIND_TEXT_COMMAND,
      keyId: "find-text",
      keywords: "search replace copy words rename text",
      run: () => globalThis.dispatchEvent(new CustomEvent(FIND_TEXT_EVENT)),
      title: "Find and replace text",
    },
    toFindTextReason(inProject)
  );

const toCopyPngReason = (inProject: boolean): string | null => {
  if (inProject) {
    return null;
  }

  return "Open a project to copy a frame";
};

const copyPngCommand = (inProject: boolean): Command =>
  withDisabled(
    {
      group: "Edit",
      icon: "image",
      id: "edit.copy-png",
      keyId: "copy-png",
      keywords: "clipboard image frame layer screenshot export",
      run: () => globalThis.dispatchEvent(new CustomEvent(COPY_PNG_EVENT)),
      title: copy.copyAsPng,
    },
    toCopyPngReason(inProject)
  );

const toFilesReason = (inProject: boolean): string | null => {
  if (inProject) {
    return null;
  }

  return copy.textOpenAProject;
};

const filesCommand = (inProject: boolean): Command =>
  withDisabled(
    {
      group: "Go",
      icon: "file",
      id: "go.file",
      keyId: "go-to-file",
      keywords: "open source code finder",
      run: () => openLayer("files"),
      title: copy.goToFile,
    },
    toFilesReason(inProject)
  );

const CONNECT_AI: Command = {
  group: "Go",
  icon: "sparkle",
  id: CONNECT_AI_COMMAND,
  keywords: "mcp agent claude code cursor codex desktop token setup",
  run: openConnectAi,
  title: "Connect AI…",
};

const home = (): void => uiStore.set({ activeProjectId: null, screen: "home" });

const toHomeReason = (inProject: boolean): string | null => {
  if (inProject || uiStore.get().screen !== "home") {
    return null;
  }

  return "You are on Home";
};

const globalCommands = (openShortcuts: () => void): Command[] => {
  const inProject = uiStore.get().activeProjectId !== null;

  return [
    withDisabled(
      {
        group: "Go",
        icon: "folder",
        id: "go.home",
        keyId: "home",
        keywords: "projects back",
        run: home,
        title: "Go to Home",
      },
      toHomeReason(inProject)
    ),
    {
      group: "Go",
      icon: "plus",
      id: "project.new",
      keywords: "create start prompt",
      run: () => {
        goHome();
        focusNewProject();
      },
      title: "New project",
    },
    {
      group: "Go",
      icon: "folder",
      id: "project.open-folder",
      keywords: "import vite html",
      run: runOpenFolder,
      title: "Open a folder…",
    },
    {
      group: "Go",
      icon: "palette",
      id: "go.design-systems",
      keywords: "packs library tokens",
      run: () =>
        uiStore.set({
          activeProjectId: null,
          libraryFrom: null,
          screen: "design-systems",
        }),
      title: "Design systems",
    },
    {
      group: "Go",
      icon: "palette",
      id: "go.new-design-system",
      keywords: "pack create",
      run: () =>
        uiStore.set({
          activeProjectId: null,
          returnTo: "home",
          screen: "new-design-system",
        }),
      title: "New design system",
    },
    filesCommand(inProject),
    findTextCommand(inProject),
    copyPngCommand(inProject),
    ...THEME_COMMANDS,
    CONNECT_AI,
    {
      group: "Help",
      icon: "sliders",
      id: "help.shortcuts",
      keyId: "shortcuts",
      keywords: "keys keymap cheat sheet",
      run: openShortcuts,
      title: "Keyboard shortcuts",
    },
  ];
};

export { focusNewProject, globalCommands, runThemeCommand };
