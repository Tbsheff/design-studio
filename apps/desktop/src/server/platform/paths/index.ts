import { realpathSync } from "node:fs";
import path from "node:path";

const BLOCKED_SEGMENTS = new Set([".git", "node_modules"]);

const realpathNearest = (target: string): string => {
  const remainder: string[] = [];
  let current = target;

  for (;;) {
    try {
      const real = realpathSync(current);

      if (remainder.length > 0) {
        return path.join(real, ...remainder);
      }

      return real;
    } catch {
      const parent = path.dirname(current);

      if (parent === current) {
        return target;
      }

      remainder.unshift(path.basename(current));
      current = parent;
    }
  }
};

const workTreeRoot = (workTree: string): string =>
  realpathNearest(path.resolve(workTree));

const resolveInside = (root: string, raw: string): string => {
  if (path.isAbsolute(raw)) {
    return raw;
  }

  return path.resolve(root, raw);
};

const checkPathInside = (workTree: string, raw: string): string | null => {
  if (raw.startsWith("~")) {
    return `Path ${raw} is outside the work tree.`;
  }

  const root = workTreeRoot(workTree);
  const absolute = resolveInside(root, raw);
  const real = realpathNearest(path.normalize(absolute));
  const relative = path.relative(root, real);

  if (relative === "") {
    return null;
  }

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return `Path ${raw} is outside the work tree.`;
  }

  const segments = relative.split(path.sep);
  const blocked = segments.find((segment) => BLOCKED_SEGMENTS.has(segment));

  if (blocked) {
    return `Path ${raw} is inside ${blocked}, which is off limits.`;
  }

  return null;
};

export { BLOCKED_SEGMENTS, checkPathInside, realpathNearest, workTreeRoot };
