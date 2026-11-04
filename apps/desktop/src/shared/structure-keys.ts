import type { StructureKey } from "./contracts.js";
import { matchesKey } from "./keymap.js";
import type { KeyId, KeyInput } from "./keymap.js";

export const STRUCTURE_KEY_IDS: Record<StructureKey, KeyId> = {
  cut: "layer-cut",
  delete: "layer-delete",
  duplicate: "layer-duplicate",
  group: "layer-group",
  paste: "layer-paste",
  unwrap: "layer-unwrap",
  wrap: "layer-wrap",
};

const ORDER = Object.keys(STRUCTURE_KEY_IDS) as StructureKey[];

export function structureKeyOf(
  event: KeyInput,
  mac: boolean
): StructureKey | null {
  return (
    ORDER.find((key) => matchesKey(STRUCTURE_KEY_IDS[key], event, mac)) ?? null
  );
}
