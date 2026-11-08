const SEGMENT_PARAM = /^\[(?<name>[A-Za-z0-9_]+)\]$/u;

const GROUP_SEGMENT = /^\(.+\)$/u;

const toParts = (path: string): readonly string[] =>
  path.split("/").filter((part) => part !== "" && part !== ".");

const toNormalized = (parts: readonly string[]): readonly string[] => {
  const stack: string[] = [];

  for (const part of parts) {
    if (part === "..") {
      stack.pop();
    } else {
      stack.push(part);
    }
  }

  return stack;
};

const toMovedSpecifier = (
  specifier: string,
  fromDir: string,
  toDir: string
): string => {
  if (!specifier.startsWith(".") || fromDir === toDir) {
    return specifier;
  }

  const target = toNormalized([...toParts(fromDir), ...toParts(specifier)]);
  const base = toParts(toDir);
  let shared = 0;

  while (
    shared < base.length &&
    shared < target.length &&
    base[shared] === target[shared]
  ) {
    shared += 1;
  }

  const up = base.slice(shared).map(() => "..");
  const down = target.slice(shared);
  const joined = [...up, ...down].join("/");

  if (up.length === 0) {
    return `./${joined}`;
  }

  return joined;
};

const toRouteParamNames = (route: string): readonly string[] =>
  toParts(route).flatMap((segment) => {
    const name = SEGMENT_PARAM.exec(segment)?.groups?.name ?? null;

    if (name === null) {
      return [];
    }

    return [name];
  });

const toUrlSegments = (
  segments: readonly string[],
  params: Readonly<Record<string, string>>
): readonly string[] =>
  segments.flatMap((segment) => {
    if (GROUP_SEGMENT.test(segment)) {
      return [];
    }

    const name = SEGMENT_PARAM.exec(segment)?.groups?.name ?? null;

    if (name === null) {
      return [segment];
    }

    return [params[name] ?? segment];
  });

export { toMovedSpecifier, toRouteParamNames, toUrlSegments };
