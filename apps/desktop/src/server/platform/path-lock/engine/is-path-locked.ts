const ESCAPED = /[$()+.[\\\]^{|}]/gu;
const BACKSLASH = /\\/gu;
const DOT_SLASH = "./";

const compiled = new Map<string, RegExp>();

const toRelative = (text: string): string => {
  let relative = text.replaceAll(BACKSLASH, "/");

  while (relative.startsWith(DOT_SLASH)) {
    relative = relative.slice(DOT_SLASH.length);
  }

  while (relative.endsWith("/")) {
    relative = relative.slice(0, -1);
  }

  return relative;
};

const toSegmentSource = (segment: string): string => {
  let source = "";

  for (const char of segment) {
    if (char === "*") {
      source += "[^/]*";
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += char.replaceAll(ESCAPED, String.raw`\$&`);
    }
  }

  return source;
};

const toGlobSource = (glob: string): string => {
  const parts = glob.split("/");
  const last = parts.length - 1;
  let source = "";

  for (const [index, part] of parts.entries()) {
    const isLast = index === last;

    if (part !== "**") {
      source += toSegmentSource(part);

      if (!isLast) {
        source += "/";
      }
    } else if (isLast) {
      source += ".*";
    } else {
      source += "(?:[^/]+/)*";
    }
  }

  return source;
};

const toGlobRegex = (raw: string): RegExp | null => {
  const glob = toRelative(raw);

  if (glob === "") {
    return null;
  }

  const found = compiled.get(glob) ?? null;

  if (found !== null) {
    return found;
  }

  let prefix = "^(?:.*/)?";

  if (glob.includes("/")) {
    prefix = "^";
  }

  const made = new RegExp(`${prefix}${toGlobSource(glob)}(?:/.*)?$`, "u");
  compiled.set(glob, made);

  return made;
};

const isPathLocked = (globs: readonly string[], path: string): boolean => {
  const relative = toRelative(path);

  if (relative === "" || globs.length === 0) {
    return false;
  }

  return globs.some((glob) => {
    const regex = toGlobRegex(glob);

    return regex !== null && regex.test(relative);
  });
};

export { isPathLocked };
