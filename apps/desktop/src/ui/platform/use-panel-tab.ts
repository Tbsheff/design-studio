import { useCallback, useState } from "react";

import { pick } from "./pick.js";
import { readStored, writeStored } from "./storage";
import { isObject } from "./value-guards.js";

type PanelTab =
  | "chat"
  | "design"
  | "tweaks"
  | "tokens"
  | "components"
  | "comments"
  | "versions"
  | "system";

const PANE_MODES: readonly PanelTab[] = ["chat", "design", "comments"];

const TABS: readonly PanelTab[] = [
  "chat",
  "design",
  "tweaks",
  "tokens",
  "components",
  "comments",
  "versions",
  "system",
];

const TAB_KEY = "design-studio.panel-tab.v2";
const MAX_PROJECTS = 100;

const readAll = (): Record<string, PanelTab> => {
  try {
    const raw: unknown = JSON.parse(readStored(TAB_KEY) ?? "{}");

    if (isObject(raw)) {
      return raw as Record<string, PanelTab>;
    }

    return {};
  } catch {
    return {};
  }
};

const readTab = (projectId: string): PanelTab | null => {
  const raw = readAll()[projectId];

  return TABS.find((tab) => tab === raw) ?? null;
};

const writeTab = (projectId: string, tab: PanelTab): void => {
  const all = new Map(Object.entries(readAll()));

  all.delete(projectId);
  all.set(projectId, tab);

  const kept = [...all].slice(-MAX_PROJECTS);

  writeStored(TAB_KEY, JSON.stringify(Object.fromEntries(kept)));
};

interface PanelTabState {
  choose: (next: PanelTab) => void;
  show: (next: PanelTab) => void;
  tab: PanelTab;
}

const usePanelTab = (projectId: string, eligible: boolean): PanelTabState => {
  const [chosen, setChosen] = useState<PanelTab | null>(() =>
    readTab(projectId)
  );

  const [isAutoSwitched, setIsAutoSwitched] = useState(false);

  if (eligible && chosen === null && !isAutoSwitched) {
    setIsAutoSwitched(true);
  }

  const choose = useCallback(
    (next: PanelTab) => {
      writeTab(projectId, next);
      setChosen(next);
    },
    [projectId]
  );

  const show = choose;

  const tab = chosen ?? pick(isAutoSwitched, "design", "chat");

  return { choose, show, tab };
};

export { PANE_MODES, usePanelTab };

export type { PanelTab };
