const PARENT_SEGMENT = "..";

const toAliasRest = (alias: string): string[] | null => {
  const segments = alias.split("/").filter((segment) => segment !== "");

  if (alias.startsWith("@/") || alias.startsWith("~/")) {
    return segments.slice(1);
  }

  if (alias.startsWith(".") || alias.startsWith("/")) {
    return null;
  }

  if (alias.startsWith("@")) {
    return segments.slice(2);
  }

  return segments.slice(1);
};

const toAliasDirectory = (alias: string, hasSrc: boolean): string | null => {
  const rest = toAliasRest(alias);

  if (rest === null || rest.includes(PARENT_SEGMENT)) {
    return null;
  }

  if (hasSrc) {
    return ["src", ...rest].join("/");
  }

  return rest.join("/");
};

export { toAliasDirectory };
