import { useCallback, useEffect, useRef, useState } from "react";

import { readStored, writeStored } from "./storage";

export type PanelTab =
  | "chat"
  | "design"
  | "tweaks"
  | "tokens"
  | "components"
  | "comments"
  | "versions"
  | "system";

export const PANE_MODES: readonly PanelTab[] = ["chat", "design", "comments"];

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

function readAll(): Record<string, PanelTab> {
  try {
    const raw: unknown = JSON.parse(readStored(TAB_KEY) ?? "{}");

    return raw && typeof raw === "object"
      ? (raw as Record<string, PanelTab>)
      : {};
  } catch {
    return {};
  }
}

function readTab(projectId: string): PanelTab | null {
  const raw = readAll()[projectId];

  return TABS.find((tab) => tab === raw) ?? null;
}

function writeTab(projectId: string, tab: PanelTab): void {
  const all = readAll();
  delete all[projectId];
  all[projectId] = tab;
  const kept = Object.entries(all).slice(-MAX_PROJECTS);

  writeStored(TAB_KEY, JSON.stringify(Object.fromEntries(kept)));
}

export function usePanelTab(projectId: string, eligible: boolean) {
  const chosen = useRef(readTab(projectId));
  const autoSwitched = useRef(false);
  const [tab, setTab] = useState<PanelTab>(chosen.current ?? "chat");

  useEffect(() => {
    if (!eligible || chosen.current !== null || autoSwitched.current) {
      return;
    }

    autoSwitched.current = true;
    setTab("design");
  }, [eligible]);

  const choose = useCallback(
    (next: PanelTab) => {
      chosen.current = next;
      writeTab(projectId, next);
      setTab(next);
    },
    [projectId]
  );

  return { tab, choose, show: choose };
}
