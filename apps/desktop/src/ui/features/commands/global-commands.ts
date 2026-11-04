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
    id: "theme.system",
    title: "Theme: match the system",
    group: "View",
    icon: "moon",
    keywords: "appearance auto dark light",
    run: () => setTheme("system"),
  },
  {
    id: "theme.light",
    title: "Theme: light",
    group: "View",
    icon: "moon",
    keywords: "appearance",
    run: () => setTheme("light"),
  },
  {
    id: "theme.dark",
    title: "Theme: dark",
    group: "View",
    icon: "moon",
    keywords: "appearance night",
    run: () => setTheme("dark"),
  },
];

function findTextCommand(inProject: boolean): Command {
  return {
    id: FIND_TEXT_COMMAND,
    title: "Find and replace text",
    group: "Edit",
    icon: "search",
    keyId: "find-text",
    keywords: "search replace copy words rename text",
    run: () => window.dispatchEvent(new CustomEvent(FIND_TEXT_EVENT)),
    ...(inProject ? {} : { disabled: "Open a project to find text" }),
  };
}

export function globalCommands(openShortcuts: () => void): Command[] {
  const inProject = uiStore.get().activeProjectId !== null;
  const home = () => uiStore.set({ activeProjectId: null, screen: "home" });

  return [
    {
      id: "go.home",
      title: "Go to Home",
      group: "Go",
      icon: "folder",
      keyId: "home",
      keywords: "projects back",
      run: home,
      ...(inProject || uiStore.get().screen !== "home"
        ? {}
        : { disabled: "You are on Home" }),
    },
    {
      id: "project.new",
      title: "New project",
      group: "Go",
      icon: "plus",
      keywords: "create start prompt",
      run: () => {
        goHome();
        focusNewProject();
      },
    },
    {
      id: "project.open-folder",
      title: "Open a folder…",
      group: "Go",
      icon: "folder",
      keywords: "import vite html",
      run: () => void openFolder().catch(() => undefined),
    },
    {
      id: "go.design-systems",
      title: "Design systems",
      group: "Go",
      icon: "palette",
      keywords: "packs library tokens",
      run: () =>
        uiStore.set({
          activeProjectId: null,
          screen: "design-systems",
          libraryFrom: null,
        }),
    },
    {
      id: "go.new-design-system",
      title: "New design system",
      group: "Go",
      icon: "palette",
      keywords: "pack create",
      run: () =>
        uiStore.set({
          activeProjectId: null,
          screen: "new-design-system",
          returnTo: "home",
        }),
    },
    findTextCommand(inProject),
    ...THEME_COMMANDS,
    {
      id: "help.shortcuts",
      title: "Keyboard shortcuts",
      group: "Help",
      icon: "sliders",
      keyId: "shortcuts",
      keywords: "keys keymap cheat sheet",
      run: openShortcuts,
    },
  ];
}
