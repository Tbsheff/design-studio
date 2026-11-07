import type { WireOutput, getEffect, listEffect } from "./deps.js";

type EffectInfo = WireOutput<typeof getEffect>;

type EffectItem = EffectInfo["effects"][number];

type EffectStyle = WireOutput<typeof listEffect>["items"][number];

interface EffectIds {
  readonly directionId: string;
  readonly projectId: string;
}

export type { EffectIds, EffectInfo, EffectItem, EffectStyle };
