const toPathParts = (value: string): readonly string[] =>
  value.split("/").filter((part) => part !== "" && part !== ".");

const toNormalizedPath = (value: string): string => {
  const kept: string[] = [];

  for (const part of toPathParts(value)) {
    if (part === ".." && kept.length > 0 && kept.at(-1) !== "..") {
      kept.pop();
    } else {
      kept.push(part);
    }
  }

  return kept.join("/");
};

const toJoinedPath = (base: string, relative: string): string =>
  toNormalizedPath(`${base}/${relative}`);

const toDirectory = (file: string): string => {
  const parts = toPathParts(file);

  return parts.slice(0, -1).join("/");
};

const toBaseName = (file: string): string => toPathParts(file).at(-1) ?? "";

const toRelativePath = (fromDir: string, target: string): string => {
  const from = toPathParts(fromDir);
  const to = toPathParts(target);
  let shared = 0;

  while (
    shared < from.length &&
    shared < to.length &&
    from[shared] === to[shared]
  ) {
    shared += 1;
  }

  const up = from.slice(shared).map(() => "..");

  return [...up, ...to.slice(shared)].join("/");
};

const toRelativeSpecifier = (fromDir: string, target: string): string => {
  const relative = toRelativePath(fromDir, target);

  if (relative.startsWith("..")) {
    return relative;
  }

  return `./${relative}`;
};

const isInsideFolder = (folder: string, target: string): boolean =>
  target.startsWith(`${toNormalizedPath(folder)}/`);

export {
  isInsideFolder,
  toBaseName,
  toDirectory,
  toJoinedPath,
  toNormalizedPath,
  toPathParts,
  toRelativePath,
  toRelativeSpecifier,
};
