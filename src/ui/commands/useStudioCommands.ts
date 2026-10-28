import { useEffect, useRef } from 'react';
import { matchesKey, type KeyId } from '../../shared/keymap';
import type { PanelTab } from '../usePanelTab';
import { isTypingTarget } from '../typingTarget';
import { IS_MAC } from './keys';
import { listenForCommands, runCommand, useCommands, type Command } from './registry';

export interface StudioActions {
  running: boolean;
  directions: { id: string; name: string }[];
  directionId: string | null;
  onHome: () => void;
  onSettings: () => void;
  onDesignMd: () => void;
  onPanel: (tab: PanelTab) => void;
  onDirection: (id: string) => void;
  onStop: () => void;
  onPolish: () => void;
  onMakeStates: (() => void) | null;
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
  exportId: string | null;
  onExport: (versionId: string) => void;
  onShip: (() => void) | null;
}

const PANELS: { tab: PanelTab; title: string; icon: Command['icon'] }[] = [
  { tab: 'chat', title: 'Show Chat', icon: 'chat' },
  { tab: 'design', title: 'Edit mode: inspector and layers', icon: 'pointer' },
  { tab: 'comments', title: 'Show Comments', icon: 'comment' },
  { tab: 'versions', title: 'Show Versions', icon: 'history' },
  { tab: 'tokens', title: 'Show Tokens', icon: 'token' },
  { tab: 'components', title: 'Show Components', icon: 'component' },
  { tab: 'tweaks', title: 'Show Tweaks', icon: 'sliders' },
  { tab: 'system', title: 'Show Design system', icon: 'palette' },
];

const REGIONS = ['.canvas .toolbar button:not(:disabled)', '.canvas .stage', '.pane-left .pane-project', '.prompt [data-slot="composer-input"]'];

function regionOf(element: Element | null): number {
  if (!element) return -1;
  if (element.closest('.canvas .toolbar')) return 0;
  if (element.closest('.canvas .stage')) return 1;
  if (element.closest('.prompt')) return 3;
  if (element.closest('.pane-left')) return 2;
  return -1;
}

export function moveRegion(step: 1 | -1): void {
  const from = regionOf(document.activeElement);
  for (let i = 1; i <= REGIONS.length; i += 1) {
    const index = (((from < 0 ? (step === 1 ? -1 : 0) : from) + step * i) % REGIONS.length + REGIONS.length) % REGIONS.length;
    const target = document.querySelector<HTMLElement>(REGIONS[index] ?? '');
    if (!target || target.getClientRects().length === 0) continue;
    target.focus({ preventScroll: true });
    return;
  }
}

function stepDirection(a: StudioActions, step: 1 | -1): (() => void) | null {
  if (a.directions.length < 2) return null;
  const at = a.directions.findIndex((d) => d.id === a.directionId);
  const next = a.directions[(at + step + a.directions.length) % a.directions.length];
  return next ? () => a.onDirection(next.id) : null;
}

function studioCommands(a: StudioActions): Command[] {
  const next = stepDirection(a, 1);
  const prev = stepDirection(a, -1);
  const noDirection = a.directions.length < 2 ? 'Only one direction' : undefined;
  return [
    { id: 'go.home', title: 'Go to Home', group: 'Go', icon: 'folder', keyId: 'home', keywords: 'projects back exit', run: a.onHome },
    { id: 'project.settings', title: 'Project settings', group: 'Go', icon: 'settings', keyId: 'settings', keywords: 'model shell preferences', run: a.onSettings },
    { id: 'project.design-md', title: 'Edit DESIGN.md', group: 'Go', icon: 'doc', keywords: 'design system brief', run: a.onDesignMd },
    { id: 'direction.next', title: 'Next direction', group: 'Go', icon: 'branch', keyId: 'next-direction', run: next ?? (() => undefined), ...(noDirection ? { disabled: noDirection } : {}) },
    { id: 'direction.prev', title: 'Previous direction', group: 'Go', icon: 'branch', keyId: 'prev-direction', run: prev ?? (() => undefined), ...(noDirection ? { disabled: noDirection } : {}) },
    ...a.directions
      .filter((d) => d.id !== a.directionId)
      .map((d) => ({ id: `direction.open.${d.id}`, title: `Open direction ${d.name}`, group: 'Go', icon: 'branch' as const, keywords: 'switch variation', run: () => a.onDirection(d.id) })),
    ...PANELS.map((p) => ({ id: `panel.${p.tab}`, title: p.title, group: 'Panels', icon: p.icon, keywords: 'tab side panel pane mode sheet', run: () => a.onPanel(p.tab) })),
    { id: 'panel.focus-composer', title: 'Ask the agent', group: 'Run', icon: 'chat', keywords: 'composer prompt message chat', run: () => focusComposer(a) },
    { id: 'run.stop', title: 'Stop the run', group: 'Run', icon: 'stop', keyId: 'stop', keywords: 'cancel interrupt', run: a.onStop, ...(a.running ? {} : { disabled: 'No run is going' }) },
    { id: 'run.polish', title: 'Polish this design', group: 'Run', icon: 'sparkle', keywords: 'improve refine critique', run: a.onPolish, ...(a.running ? { disabled: 'A run is going' } : {}) },
    {
      id: 'run.states',
      title: 'Make UI states of this page',
      group: 'Run',
      icon: 'layers',
      slash: 'states',
      keywords: 'empty loading error success validation menu frames',
      run: () => a.onMakeStates?.(),
      ...(a.running ? { disabled: 'A run is going' } : a.onMakeStates ? {} : { disabled: 'No direction yet' }),
    },
    { id: 'edit.undo', title: 'Undo', group: 'Version', icon: 'undo', keyId: 'undo', run: a.onUndo, ...(a.canUndo ? {} : { disabled: 'Nothing to undo' }) },
    { id: 'edit.redo', title: 'Redo', group: 'Version', icon: 'restore', keyId: 'redo', run: a.onRedo, ...(a.canRedo ? {} : { disabled: 'Nothing to redo' }) },
    { id: 'version.export', title: 'Export…', group: 'Version', icon: 'download', keywords: 'share download png pdf html handoff zip source files', run: () => a.exportId && a.onExport(a.exportId), ...(a.exportId ? {} : { disabled: 'No version yet' }) },
    ...(a.onShip ? [{ id: 'version.ship', title: 'Ship as a pull request…', group: 'Version', icon: 'branch' as const, keywords: 'share branch git commit push pull request github gh', run: a.onShip }] : []),
    { id: 'view.next-region', title: 'Focus the next region', group: 'View', icon: 'sidebar', keyId: 'focus-next-region', keywords: 'f6 toolbar canvas inspector chat', run: () => moveRegion(1) },
  ];
}

function focusComposer(a: StudioActions): void {
  a.onPanel('chat');
  window.requestAnimationFrame(() => document.querySelector<HTMLElement>('.prompt [data-slot="composer-input"]')?.focus());
}

const KEYED: [KeyId, string][] = [
  ['home', 'go.home'],
  ['settings', 'project.settings'],
  ['next-direction', 'direction.next'],
  ['prev-direction', 'direction.prev'],
];

function useStudioKeys(): void {
  useEffect(() => {
    listenForCommands();
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (event.key === 'F6' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        moveRegion(event.shiftKey ? -1 : 1);
        return;
      }
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const hit = KEYED.find(([key]) => matchesKey(key, event, IS_MAC));
      if (!hit || (isTypingTarget(event.target) && !event.metaKey && !event.ctrlKey)) return;
      event.preventDefault();
      runCommand(hit[1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function useStudioCommands() {
  const actions = useRef<StudioActions | null>(null);
  useCommands(() => (actions.current ? studioCommands(actions.current) : []));
  useStudioKeys();
  return actions;
}
