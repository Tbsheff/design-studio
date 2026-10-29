export type KeyGroup = 'General' | 'Run and chat' | 'Canvas' | 'Selection' | 'Edit' | 'Home';

export interface KeyBinding {
  id: string;
  label: string;
  keys: readonly string[];
  group: KeyGroup;
  hold?: boolean;
  desktop?: boolean;
}

export const KEYMAP = [
  { id: 'palette', label: 'Command palette', keys: ['Mod+K'], group: 'General' },
  { id: 'shortcuts', label: 'Keyboard shortcuts', keys: ['?', 'Ctrl+Shift+?'], group: 'General' },
  { id: 'focus-next-region', label: 'Next region', keys: ['F6'], group: 'General' },
  { id: 'focus-prev-region', label: 'Previous region', keys: ['Shift+F6'], group: 'General' },
  { id: 'home', label: 'Go to Home', keys: ['Mod+Shift+H'], group: 'General' },
  { id: 'settings', label: 'Project settings', keys: ['Mod+,'], group: 'General' },
  { id: 'new-project', label: 'New project', keys: ['Mod+N'], group: 'General', desktop: true },
  { id: 'open-folder', label: 'Open folder', keys: ['Mod+O'], group: 'General', desktop: true },
  { id: 'next-direction', label: 'Next direction', keys: ['Mod+Alt+]'], group: 'General' },
  { id: 'prev-direction', label: 'Previous direction', keys: ['Mod+Alt+['], group: 'General' },

  { id: 'run', label: 'Send', keys: ['Mod+Enter'], group: 'Run and chat' },
  { id: 'stop', label: 'Stop the run', keys: ['Esc', 'Mod+.'], group: 'Run and chat' },
  { id: 'composer-mode', label: 'Next run mode (Edit, Plan, Critique)', keys: ['Mod+Shift+M'], group: 'Run and chat' },
  { id: 'slash', label: 'Commands and skills', keys: ['/'], group: 'Run and chat' },
  { id: 'mention', label: 'Mention a file or token', keys: ['@'], group: 'Run and chat' },
  { id: 'prompt-history', label: 'Last prompt', keys: ['↑'], group: 'Run and chat' },
  { id: 'history-search', label: 'Search prompt history', keys: ['Ctrl+R'], group: 'Run and chat' },
  { id: 'quick-feedback', label: 'Quick feedback on a pin', keys: ['F'], group: 'Run and chat' },
  { id: 'inline-prompt', label: 'Ask the agent at the selection', keys: ['Mod+I'], group: 'Run and chat' },

  { id: 'tool-select', label: 'Select tool', keys: ['V'], group: 'Canvas' },
  { id: 'tool-comment', label: 'Comment tool', keys: ['C'], group: 'Canvas' },
  { id: 'tool-draw', label: 'Pen tool', keys: ['P'], group: 'Canvas' },
  { id: 'layers', label: 'Edit mode and layers', keys: ['Alt+1'], group: 'Canvas' },
  { id: 'pan', label: 'Pan', keys: ['Space'], group: 'Canvas', hold: true },
  { id: 'zoom-click', label: 'Zoom where you click', keys: ['Z'], group: 'Canvas', hold: true },
  { id: 'zoom-in', label: 'Zoom in', keys: ['=', 'Mod+='], group: 'Canvas' },
  { id: 'zoom-out', label: 'Zoom out', keys: ['-', 'Mod+-'], group: 'Canvas' },
  { id: 'zoom-actual', label: 'Zoom to 100%', keys: ['Shift+0', 'Mod+0'], group: 'Canvas' },
  { id: 'zoom-fit', label: 'Zoom to fit', keys: ['Shift+1', 'Mod+1'], group: 'Canvas' },
  { id: 'zoom-selection', label: 'Zoom to selection', keys: ['Shift+2', 'Mod+2'], group: 'Canvas' },
  { id: 'measure', label: 'Measure distance', keys: ['Alt'], group: 'Canvas', hold: true },
  { id: 'rulers', label: 'Show or hide rulers', keys: ['Shift+R'], group: 'Canvas' },

  { id: 'select-child', label: 'Select child', keys: ['Enter'], group: 'Selection' },
  { id: 'select-parent', label: 'Select parent', keys: ['Shift+Enter'], group: 'Selection' },
  { id: 'select-next', label: 'Next sibling', keys: ['Tab'], group: 'Selection' },
  { id: 'select-prev', label: 'Previous sibling', keys: ['Shift+Tab'], group: 'Selection' },
  { id: 'edit-text', label: 'Edit text', keys: ['Enter'], group: 'Selection' },
  { id: 'move-up', label: 'Move up', keys: ['Alt+↑'], group: 'Selection' },
  { id: 'move-down', label: 'Move down', keys: ['Alt+↓'], group: 'Selection' },
  { id: 'auto-layout', label: 'Add auto layout', keys: ['Shift+A'], group: 'Selection' },
  { id: 'remove-auto-layout', label: 'Remove auto layout', keys: ['Alt+Shift+A'], group: 'Selection' },
  { id: 'align-left', label: 'Align left', keys: ['Alt+A'], group: 'Selection' },
  { id: 'align-center', label: 'Align center', keys: ['Alt+H'], group: 'Selection' },
  { id: 'align-right', label: 'Align right', keys: ['Alt+D'], group: 'Selection' },
  { id: 'align-top', label: 'Align top', keys: ['Alt+W'], group: 'Selection' },
  { id: 'align-middle', label: 'Align middle', keys: ['Alt+V'], group: 'Selection' },
  { id: 'align-bottom', label: 'Align bottom', keys: ['Alt+S'], group: 'Selection' },
  { id: 'distribute-h', label: 'Distribute horizontally', keys: ['Alt+Shift+H'], group: 'Selection' },
  { id: 'distribute-v', label: 'Distribute vertically', keys: ['Alt+Shift+V'], group: 'Selection' },
  { id: 'tidy-up', label: 'Tidy up', keys: ['Ctrl+Alt+T'], group: 'Selection' },
  { id: 'layer-delete', label: 'Delete', keys: ['Backspace', 'Delete'], group: 'Selection' },
  { id: 'layer-duplicate', label: 'Duplicate', keys: ['Mod+D'], group: 'Selection' },
  { id: 'layer-wrap', label: 'Wrap in auto layout frame', keys: ['Mod+Alt+G'], group: 'Selection' },
  { id: 'layer-unwrap', label: 'Unwrap', keys: ['Mod+Shift+G'], group: 'Selection' },
  { id: 'layer-cut', label: 'Cut to move', keys: ['Mod+X'], group: 'Selection' },
  { id: 'layer-paste', label: 'Paste into selection', keys: ['Mod+V'], group: 'Selection' },
  { id: 'layer-group', label: 'Group selection', keys: ['Mod+G'], group: 'Selection' },
  { id: 'deselect', label: 'Clear selection', keys: ['Esc'], group: 'Selection' },

  { id: 'undo', label: 'Undo', keys: ['Mod+Z'], group: 'Edit' },
  { id: 'redo', label: 'Redo', keys: ['Mod+Shift+Z'], group: 'Edit' },
  { id: 'rename', label: 'Rename layer or version', keys: ['F2'], group: 'Edit' },
  { id: 'save-design-md', label: 'Save DESIGN.md', keys: ['Mod+S'], group: 'Edit' },

  { id: 'project-rename', label: 'Rename project', keys: ['F2'], group: 'Home' },
  { id: 'project-duplicate', label: 'Duplicate project', keys: ['Mod+D'], group: 'Home' },
  { id: 'project-delete', label: 'Move project to trash', keys: ['Mod+Backspace'], group: 'Home' },
  { id: 'project-menu', label: 'Project menu', keys: ['Shift+F10'], group: 'Home' },
] as const satisfies readonly KeyBinding[];

export type KeyId = (typeof KEYMAP)[number]['id'];

const BY_ID = new Map<string, KeyBinding>(KEYMAP.map((entry) => [entry.id, entry]));

export function binding(id: KeyId): KeyBinding {
  return BY_ID.get(id) as KeyBinding;
}

interface Chord {
  mod: boolean;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
}

function parse(keys: string): Chord {
  const parts = keys.length > 1 && keys.endsWith('+') ? [...keys.slice(0, -2).split('+'), '+'] : keys.split('+');
  const key = parts.pop() ?? '';
  return { mod: parts.includes('Mod'), ctrl: parts.includes('Ctrl'), shift: parts.includes('Shift'), alt: parts.includes('Alt'), key };
}

const ARROWS: Record<string, string> = { '↑': 'ArrowUp', '↓': 'ArrowDown', '←': 'ArrowLeft', '→': 'ArrowRight', Esc: 'Escape', Space: ' ' };
const SHIFTED = new Set(['?', '@', '!', '+', '_']);

export interface KeyInput {
  key: string;
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

function keyMatches(chord: Chord, event: KeyInput): boolean {
  const want = ARROWS[chord.key] ?? chord.key;
  if (/^[A-Z]$/.test(want)) return event.code === `Key${want}`;
  if (/^[0-9]$/.test(want)) return event.code === `Digit${want}`;
  if (want === ']' || want === '[') return event.code === (want === ']' ? 'BracketRight' : 'BracketLeft');
  return event.key === want || event.key.toLowerCase() === want.toLowerCase();
}

export function chordMatches(keys: string, event: KeyInput, mac: boolean): boolean {
  const chord = parse(keys);
  const meta = chord.mod && mac;
  const ctrl = chord.ctrl || (chord.mod && !mac);
  if (event.metaKey !== meta || event.ctrlKey !== ctrl || event.altKey !== chord.alt) return false;
  if (!SHIFTED.has(chord.key) && event.shiftKey !== chord.shift) return false;
  return keyMatches(chord, event);
}

export function matchesKey(id: KeyId, event: KeyInput, mac: boolean): boolean {
  return binding(id).keys.some((keys) => chordMatches(keys, event, mac));
}

const MAC_MODS: [keyof Omit<Chord, 'key'>, string][] = [
  ['ctrl', '⌃'],
  ['alt', '⌥'],
  ['shift', '⇧'],
  ['mod', '⌘'],
];
const PC_MODS: [keyof Omit<Chord, 'key'>, string][] = [
  ['mod', 'Ctrl'],
  ['ctrl', 'Ctrl'],
  ['alt', 'Alt'],
  ['shift', 'Shift'],
];
const MAC_KEYS: Record<string, string> = { Enter: '↩', Backspace: '⌫', Esc: 'Esc', Tab: '⇥' };

export function keyParts(keys: string, mac: boolean): string[] {
  const chord = parse(keys);
  const mods = (mac ? MAC_MODS : PC_MODS).filter(([flag]) => chord[flag]).map(([, label]) => label);
  const key = mac ? (MAC_KEYS[chord.key] ?? chord.key) : chord.key;
  return [...new Set(mods), key];
}

export function keyLabel(keys: string, mac: boolean): string {
  return keyParts(keys, mac).join(mac ? '' : '+');
}

export function shortcutLabel(id: KeyId, mac: boolean): string {
  return keyLabel(binding(id).keys[0] ?? '', mac);
}

export function accelerator(id: KeyId): string | undefined {
  const first = binding(id).keys.find((keys) => keys.includes('+') && !keys.startsWith('Ctrl+'));
  if (!first) return undefined;
  const chord = parse(first);
  const mods = [chord.mod ? 'CmdOrCtrl' : '', chord.alt ? 'Alt' : '', chord.shift ? 'Shift' : ''].filter(Boolean);
  const key = ARROWS[chord.key] === 'ArrowUp' ? 'Up' : ARROWS[chord.key] === 'ArrowDown' ? 'Down' : chord.key;
  return [...mods, key].join('+');
}
