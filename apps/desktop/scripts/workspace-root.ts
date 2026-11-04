import path from "node:path";
import { fileURLToPath } from "node:url";

const WORKSPACE_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const toWorkspaceBin = (name: string): string =>
  path.join(WORKSPACE_ROOT, "node_modules/.bin", name);

export { WORKSPACE_ROOT, toWorkspaceBin };
