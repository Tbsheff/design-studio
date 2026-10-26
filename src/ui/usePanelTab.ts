import { useCallback, useEffect, useRef, useState } from 'react';

export type PanelTab = 'chat' | 'design' | 'tweaks' | 'tokens' | 'components' | 'comments' | 'versions' | 'system';

export const PANE_MODES: readonly PanelTab[] = ['chat', 'design', 'comments'];

const TABS: readonly PanelTab[] = ['chat', 'design', 'tweaks', 'tokens', 'components', 'comments', 'versions', 'system'];

const TAB_KEY = 'design-studio.panel-tab.v1';

function readTab(): PanelTab | null {
  try {
    const raw = localStorage.getItem(TAB_KEY);
    return TABS.find((tab) => tab === raw) ?? null;
  } catch {
    return null;
  }
}

function writeTab(tab: PanelTab): void {
  try {
    localStorage.setItem(TAB_KEY, tab);
  } catch {
    return;
  }
}

export function usePanelTab(eligible: boolean) {
  const chosen = useRef(readTab());
  const autoSwitched = useRef(false);
  const [tab, setTab] = useState<PanelTab>(chosen.current ?? 'chat');

  useEffect(() => {
    if (!eligible || chosen.current !== null || autoSwitched.current) return;
    autoSwitched.current = true;
    setTab('design');
  }, [eligible]);

  const choose = useCallback((next: PanelTab) => {
    chosen.current = next;
    writeTab(next);
    setTab(next);
  }, []);

  const show = useCallback((next: PanelTab) => setTab(next), []);

  return { tab, choose, show };
}
