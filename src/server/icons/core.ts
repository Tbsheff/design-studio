import { Schema } from "effect";

import { ICON_BUNDLED, toDecoder } from "./deps.js";
import { nameKey } from "./set.js";
import type { IconSet } from "./set.js";
import type { IconNode, SvgFrame } from "./svg.js";

const rawAttrs = Schema.Record(Schema.String, Schema.String);

const rawNode = Schema.Tuple([Schema.String, rawAttrs]);

const coreSchema = Schema.Struct({
  aliases: Schema.Record(Schema.String, Schema.String),
  icons: Schema.Record(Schema.String, Schema.Array(rawNode)),
  license: Schema.String,
  licenseText: Schema.String,
  source: Schema.String,
});

interface Core {
  readonly aliases: Readonly<Record<string, string>>;
  readonly icons: Readonly<Record<string, IconNode[]>>;
  readonly license: string;
  readonly licenseText: string;
  readonly source: string;
}

const decodeCore = toDecoder(coreSchema, "ignore");

const toNodes = (nodes: (typeof coreSchema.Type.icons)[string]): IconNode[] =>
  nodes.map(([tag, attrs]): IconNode => [tag, Object.entries(attrs)]);

const toCore = (decoded: typeof coreSchema.Type): Core => {
  const entries = Object.entries(decoded.icons);
  const icons = entries.map(([name, nodes]) => [name, toNodes(nodes)]);

  return {
    aliases: decoded.aliases,
    icons: Object.fromEntries(icons),
    license: decoded.license,
    licenseText: decoded.licenseText,
    source: decoded.source,
  };
};

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

  const decoded = decodeCore(json.default);

  if (decoded._tag === "Failure") {
    throw new Error("The bundled icon set is not valid.");
  }

  return toCore(decoded.success);
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
