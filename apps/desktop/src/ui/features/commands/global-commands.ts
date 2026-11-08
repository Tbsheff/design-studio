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

export function focusNewProject(): void {
  window.requestAnimationFrame(() =>
    findElement(document.body, '[aria-label="Describe the design"]')?.focus()
  );
}

async function openFolder(): Promise<void> {
  const picked = await pickFolder({ title: "Open a folder" });

  if (picked.kind === "canceled") {
    return;
  }

  goHome();
  requestOpenApp(picked.kind === "picked" ? picked.path : "");
}

type ThemePref = "system" | "light" | "dark";

function setTheme(pref: ThemePref): void {
  (
    window as unknown as { studioTheme?: { set: (pref: ThemePref) => void } }
  ).studioTheme?.set(pref);
}

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

function findTextCommand(inProject: boolean): Command {
  return {
    group: "Edit",
    icon: "search",
    id: FIND_TEXT_COMMAND,
    keyId: "find-text",
    keywords: "search replace copy words rename text",
    run: () => window.dispatchEvent(new CustomEvent(FIND_TEXT_EVENT)),
    title: "Find and replace text",
    ...(inProject ? {} : { disabled: "Open a project to find text" }),
  };
}

export function globalCommands(openShortcuts: () => void): Command[] {
  const inProject = uiStore.get().activeProjectId !== null;
  const home = () => uiStore.set({ activeProjectId: null, screen: "home" });

  return [
    {
      group: "Go",
      icon: "folder",
      id: "go.home",
      keyId: "home",
      keywords: "projects back",
      run: home,
      title: "Go to Home",
      ...(inProject || uiStore.get().screen !== "home"
        ? {}
        : { disabled: "You are on Home" }),
    },
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
      run: () => void openFolder().catch(() => undefined),
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
          screen: "design-systems",
          libraryFrom: null,
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
          screen: "new-design-system",
          returnTo: "home",
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
}
