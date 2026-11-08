import { withDisabled } from "./command-disabled.js";
import {
  FIND_TEXT_COMMAND,
  FIND_TEXT_EVENT,
  findElement,
  goHome,
  pickFolder,
  requestOpenApp,
  uiStore,
} from "./deps.js";
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
    findTextCommand(inProject),
    ...THEME_COMMANDS,
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

export { focusNewProject, globalCommands };
