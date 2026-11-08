import path from "node:path";

const EXTENSION_PATTERN = /\.(?:tsx|ts|jsx|js)$/u;

const toRelativeBare = (root: string, absolute: string): string =>
  path
    .relative(root, absolute)
    .split(path.sep)
    .join("/")
    .replace(EXTENSION_PATTERN, "");

export { toRelativeBare };
