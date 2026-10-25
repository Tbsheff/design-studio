import { useRef } from 'react';
import type { ZoomKey } from '../../shared/contracts';
import type { KeyId } from '../../shared/keymap';
import { uiStore, type Viewport } from '../storage';
import { PRESETS, type CanvasSource } from '../components/CanvasToolbar';
import { useCommands, type Command } from './registry';

export interface CanvasActions {
  live: boolean;
  hasHead: boolean;
  zoom: (key: ZoomKey) => void;
  selectMode: boolean;
  onSelect: () => void;
  comment: { available: boolean; on: boolean; toggle: () => void };
  draw: { on: boolean; toggle: () => void } | null;
  layersOpen: boolean;
  onSource: (kind: 'live' | 'last') => void;
  dark: { on: boolean; toggle: () => void } | null;
  onCheck: () => void;
  checking: boolean;
  presets: { id: Viewport['preset']; label: string; width: number; height: number }[];
}

const ZOOMS: { key: ZoomKey; title: string; keyId: KeyId; keywords: string }[] = [
  { key: 'fit', title: 'Zoom to fit', keyId: 'zoom-fit', keywords: 'view whole' },
  { key: 'selection', title: 'Zoom to selection', keyId: 'zoom-selection', keywords: 'view element' },
  { key: 'actual', title: 'Zoom to 100%', keyId: 'zoom-actual', keywords: 'actual size reset' },
  { key: 'in', title: 'Zoom in', keyId: 'zoom-in', keywords: 'bigger larger' },
  { key: 'out', title: 'Zoom out', keyId: 'zoom-out', keywords: 'smaller' },
];

function canvasCommands(a: CanvasActions): Command[] {
  const needLive = a.live ? {} : { disabled: 'Only in the live preview' };
  const out: Command[] = [
    ...ZOOMS.map((z) => ({ id: `view.zoom-${z.key}`, title: z.title, group: 'Canvas', icon: 'search' as const, keyId: z.keyId, keywords: z.keywords, run: () => a.zoom(z.key) })),
    { id: 'tool.select', title: a.selectMode ? 'Stop selecting' : 'Select elements', group: 'Canvas', icon: 'pointer', keyId: 'tool-select', keywords: 'pick inspect edit', run: a.onSelect },
    { id: 'view.layers', title: a.layersOpen ? 'Hide layers' : 'Show layers', group: 'View', icon: 'layers', keyId: 'layers', keywords: 'tree outline dom', run: () => uiStore.set((s) => ({ layersOpen: !s.layersOpen })), ...needLive },
    { id: 'view.live', title: 'Show the live preview', group: 'View', icon: 'radio', keywords: 'source current', run: () => a.onSource('live') },
    { id: 'view.last', title: 'Show the last completed version', group: 'View', icon: 'history', keywords: 'source previous', run: () => a.onSource('last'), ...(a.hasHead ? {} : { disabled: 'No version yet' }) },
    ...a.presets.map((p) => ({ id: `view.viewport-${p.id}`, title: `Preview at ${p.label}`, group: 'View', icon: p.id as Command['icon'], keywords: 'viewport size device breakpoint', run: () => uiStore.set({ viewport: { preset: p.id, width: p.width, height: p.height } }) })),
    { id: 'canvas.check', title: 'Check render', group: 'Canvas', icon: 'scan', keywords: 'accessibility errors overflow', run: a.onCheck, ...(a.checking ? { disabled: 'Checking now' } : {}) },
  ];
  if (a.comment.available) out.push({ id: 'tool.comment', title: a.comment.on ? 'Stop commenting' : 'Add comments', group: 'Canvas', icon: 'comment', keyId: 'tool-comment', keywords: 'pin feedback note', run: a.comment.toggle });
  if (a.draw) out.push({ id: 'tool.draw', title: a.draw.on ? 'Stop drawing' : 'Draw on the design', group: 'Canvas', icon: 'pencil', keyId: 'tool-draw', keywords: 'pen sketch stroke', run: a.draw.toggle });
  if (a.dark) out.push({ id: 'view.dark', title: a.dark.on ? 'Preview the default mode' : 'Preview dark mode', group: 'View', icon: 'moon', keywords: 'theme light', run: a.dark.toggle });
  return out;
}

export interface CanvasInput {
  live: boolean;
  hasHead: boolean;
  zoomBy: (key: ZoomKey, from: 'menu') => void;
  selectMode: boolean;
  setSelectMode: (update: (on: boolean) => boolean) => void;
  comment: { available: boolean; on: boolean; toggle: () => void; setOn: (on: boolean) => void };
  draw: { available: boolean; on: boolean; toggle: () => void };
  layersOpen: boolean;
  onSource: (source: CanvasSource) => void;
  dark: { dark: boolean; onToggle: () => void } | undefined;
  check: { run: () => void; checking: boolean };
}

function actionsOf(i: CanvasInput): CanvasActions {
  return {
    live: i.live,
    hasHead: i.hasHead,
    zoom: (key) => i.zoomBy(key, 'menu'),
    selectMode: i.selectMode,
    onSelect: () => {
      i.comment.setOn(false);
      i.setSelectMode((m) => !m);
    },
    comment: i.comment,
    draw: i.draw.available ? i.draw : null,
    layersOpen: i.layersOpen,
    onSource: (kind) => i.onSource({ kind }),
    dark: i.dark ? { on: i.dark.dark, toggle: i.dark.onToggle } : null,
    onCheck: i.check.run,
    checking: i.check.checking,
    presets: PRESETS,
  };
}

export function useCanvasCommands(input: CanvasInput): void {
  const latest = useRef(input);
  latest.current = input;
  useCommands(() => canvasCommands(actionsOf(latest.current)));
}
