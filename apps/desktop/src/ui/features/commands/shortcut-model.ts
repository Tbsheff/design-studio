import { KEYMAP, chordMatches, isDesktop } from "./deps.js";
import type { KeyBinding, KeyGroup } from "./deps.js";
import { IS_MAC } from "./keys.js";

const DESKTOP = "window" in globalThis && isDesktop();

const GROUPS: KeyGroup[] = [
  "General",
  "Run and chat",
  "Canvas",
  "Selection",
  "Edit",
  "Home",
];

interface ShortcutGroupEntries {
  readonly entries: KeyBinding[];
  readonly group: KeyGroup;
}

const toPressedIds = (event: KeyboardEvent): string[] =>
  KEYMAP.flatMap((entry) => {
    if (entry.keys.some((keys) => chordMatches(keys, event, IS_MAC))) {
      return [entry.id];
    }

    return [];
  });

const isNeedleMatch = (entry: KeyBinding, needle: string): boolean =>
  !needle ||
  entry.label.toLowerCase().includes(needle) ||
  entry.keys.some((keyName) => keyName.toLowerCase().includes(needle));

const toShortcutGroups = (query: string): ShortcutGroupEntries[] => {
  const needle = query.trim().toLowerCase();

  const shown = (KEYMAP as readonly KeyBinding[]).filter(
    (entry) => (DESKTOP || !entry.desktop) && isNeedleMatch(entry, needle)
  );

  return GROUPS.flatMap((group) => {
    const entries = shown.filter((entry) => entry.group === group);

    if (entries.length === 0) {
      return [];
    }

    return [{ entries, group }];
  });
};

const toOnClass = (isOn: boolean): string => {
  if (isOn) {
    return "on";
  }

  return "";
};

export { toOnClass, toPressedIds, toShortcutGroups };

export type { ShortcutGroupEntries };
