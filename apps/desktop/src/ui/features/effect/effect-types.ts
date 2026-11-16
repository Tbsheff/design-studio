import type { WireOutput, getEffect } from "./deps.js";

type EffectInfo = WireOutput<typeof getEffect>;

type EffectItem = EffectInfo["effects"][number];

interface EffectIds {
  readonly directionId: string;
  readonly projectId: string;
}

export type { EffectIds, EffectInfo, EffectItem };
