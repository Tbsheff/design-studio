import { z } from "zod";

import { ICON_BUNDLED } from "./deps.js";
import { nameKey } from "./set.js";
import type { IconSet } from "./set.js";
import type { IconNode, SvgFrame } from "./svg.js";

const attrsSchema = z
  .record(z.string(), z.string())
  .transform((attrs) => Object.entries(attrs));

const nodeSchema = z.tuple([z.string(), attrsSchema]);

const coreSchema = z.object({
  aliases: z.record(z.string(), z.string()),
  icons: z.record(z.string(), z.array(nodeSchema)),
  license: z.string(),
  licenseText: z.string(),
  source: z.string(),
});

type Core = z.infer<typeof coreSchema>;

const CORE_FRAME: SvgFrame = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  viewBox: "0 0 24 24",
};

interface CoreCache {
  core: Promise<Core> | null;
}

const loaded: CoreCache = { core: null };

const readCore = async (): Promise<Core> => {
  const json = await import("./lucide-core.json", { with: { type: "json" } });

  return coreSchema.parse(json.default);
};

const core = (): Promise<Core> => {
  loaded.core ??= readCore();

  return loaded.core;
};

const coreNames = async (): Promise<string[]> => {
  const { icons } = await core();

  return Object.keys(icons);
};

const coreResolve = async (raw: string): Promise<string | null> => {
  const { aliases, icons } = await core();
  const name = nameKey(raw);
  const canonical = aliases[name] ?? name;

  if (icons[canonical]) {
    return canonical;
  }

  return null;
};

const coreNodes = async (name: string): Promise<IconNode[] | null> => {
  const { icons } = await core();

  return icons[name] ?? null;
};

const noComponent = (): Promise<null> => Promise.resolve(null);

const coreSet: IconSet = {
  component: noComponent,
  frame: CORE_FRAME,
  importFrom: null,
  names: coreNames,
  nodes: coreNodes,
  resolve: coreResolve,
  source: ICON_BUNDLED,
};

export { CORE_FRAME, coreSet };
