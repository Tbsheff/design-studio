import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { rule } from "./ast.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const PATH_LITERAL = /^(?:!?(?:apps|packages|lint|docs)\/|\{(?:apps|packages|lint)\/)[^\s]*$/u;

const GLOB_CHAR = /[*?{[]/u;

const FUTURE_SUFFIX = /\*\*\/\*\.[a-z-]+\.tsx?$/u;

const LISTING_BUFFER = 67_108_864;

const DEAD_GLOB_MESSAGE =
  "A lint path or glob that matches 0 files is banned (L5), because a dead entry looks like a scope and does no work. Use one workspace-root path that matches a file, or delete the entry.";

const cache = { files: null, sorted: null };

const loadFiles = () => {
  if (cache.files === null) {
    const listing = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
      cwd: ROOT,
      encoding: "utf-8",
      maxBuffer: LISTING_BUFFER,
    });

    cache.sorted = listing.split("\0").filter(Boolean);
    cache.files = new Set(cache.sorted);
  }

  return cache;
};

const toStaticPrefix = (glob) => {
  const index = glob.search(GLOB_CHAR);

  if (index === -1) {
    return glob;
  }

  return glob.slice(0, index);
};

const hasFileUnder = (folder) => loadFiles().sorted.some((file) => file.startsWith(`${folder}/`));

const hasGlobMatch = (glob) => {
  const prefix = toStaticPrefix(glob);
  const candidates = loadFiles().sorted.filter((file) => file.startsWith(prefix));
  const folderGlob = `${glob}/**`;

  return candidates.some((file) => path.matchesGlob(file, glob) || path.matchesGlob(file, folderGlob));
};

const isLiveEntry = (entry) => {
  const glob = entry.replace(/^!/u, "");

  if (FUTURE_SUFFIX.test(glob)) {
    return true;
  }

  if (GLOB_CHAR.test(glob)) {
    return hasGlobMatch(glob);
  }

  return loadFiles().files.has(glob) || hasFileUnder(glob.replace(/\/$/u, ""));
};

const noDeadGlob = rule((context) => ({
  Literal: (node) => {
    if (node.value !== String(node.value) || !PATH_LITERAL.test(node.value)) {
      return;
    }

    if (!isLiveEntry(node.value)) {
      context.report({ message: `${DEAD_GLOB_MESSAGE} Found: ${node.value}.`, node });
    }
  },
}));

export { noDeadGlob };
