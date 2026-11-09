import type { RegistryAliases } from "./types.js";

const SPECIFIER = /(?<quote>["'])@\/(?<rest>[^"'\n]+)\k<quote>/gu;

const REGISTRY_PREFIX = /^registry\/[^/]+\//u;

const UI_SEGMENT = "ui";

const toJoined = (base: string, tail: readonly string[]): string => {
  if (tail.length === 0) {
    return base;
  }

  return `${base}/${tail.join("/")}`;
};

const toAliasBase = (head: string, aliases: RegistryAliases): string | null => {
  const bases = new Map<string, string>([
    ["components", aliases.components],
    ["hooks", aliases.hooks],
    ["lib", aliases.lib],
    ["ui", aliases.ui],
  ]);

  return bases.get(head) ?? null;
};

const toAliasSpecifier = (
  rest: string,
  aliases: RegistryAliases
): string | null => {
  const local = rest.replace(REGISTRY_PREFIX, "");

  if (local === "lib/utils") {
    return aliases.utils;
  }

  const [head = "", ...tail] = local.split("/");

  if (head === "components" && tail[0] === UI_SEGMENT) {
    return toJoined(aliases.ui, tail.slice(1));
  }

  const base = toAliasBase(head, aliases);

  if (base === null) {
    return null;
  }

  return toJoined(base, tail);
};

const toRewrittenImports = (code: string, aliases: RegistryAliases): string =>
  code.replaceAll(SPECIFIER, (whole, quote: string, rest: string) => {
    const specifier = toAliasSpecifier(rest, aliases);

    if (specifier === null) {
      return whole;
    }

    return `${quote}${specifier}${quote}`;
  });

export { toRewrittenImports };
