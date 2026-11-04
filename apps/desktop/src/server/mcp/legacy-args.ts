import type { WireArgs } from "../handlers/_core/run-action.js";

type LegacyArgs = WireArgs;

interface LegacyTool {
  readonly action: { readonly input: { readonly fields: object } };
  readonly name: string;
}

const ALIASES = {
  keep_links: { linkIds: "ids" },
  set_frame_session: { forgetCookies: "forget" },
} as const;

const DEFAULTS = {
  keep_links: { ids: "all" },
  list_links: { check: true },
} as const;

const toAliases = (name: string): Readonly<Record<string, string>> =>
  Object.entries(ALIASES).find(([key]) => key === name)?.[1] ?? {};

const toDefaults = (name: string): LegacyArgs =>
  Object.entries(DEFAULTS).find(([key]) => key === name)?.[1] ?? {};

const toRenamedArgs = (name: string, args: LegacyArgs): LegacyArgs => {
  const aliases = toAliases(name);

  return Object.fromEntries(
    Object.entries(args).map(([key, value]) => [aliases[key] ?? key, value])
  );
};

const toKnownArgs = (tool: LegacyTool, args: LegacyArgs): LegacyArgs => {
  if ("directionId" in tool.action.input.fields) {
    return args;
  }

  return Object.fromEntries(
    Object.entries(args).filter(([key]) => key !== "directionId")
  );
};

const toLegacyArgs = (tool: LegacyTool, args: LegacyArgs): LegacyArgs => ({
  ...toDefaults(tool.name),
  ...toKnownArgs(tool, toRenamedArgs(tool.name, args)),
});

export { toLegacyArgs };
