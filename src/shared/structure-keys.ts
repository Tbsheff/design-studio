import type { StructureKey } from './contracts.js';
import { matchesKey, type KeyId, type KeyInput } from './keymap.js';

export const STRUCTURE_KEY_IDS: Record<StructureKey, KeyId> = {
  delete: 'layer-delete',
  duplicate: 'layer-duplicate',
  wrap: 'layer-wrap',
  unwrap: 'layer-unwrap',
  cut: 'layer-cut',
  paste: 'layer-paste',
};

const ORDER = Object.keys(STRUCTURE_KEY_IDS) as StructureKey[];

export function structureKeyOf(event: KeyInput, mac: boolean): StructureKey | null {
  return ORDER.find((key) => matchesKey(STRUCTURE_KEY_IDS[key], event, mac)) ?? null;
}
