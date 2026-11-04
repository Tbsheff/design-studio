import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const TOOL_DIRS = ["apps/desktop/src/server/mcp", "apps/desktop/src/server/agent", "apps/desktop/src/server/agent-tools", "packages/common/actions/src"];

const SNAPSHOTS = path.join(ROOT, "apps/desktop/artifacts/mcp-snapshots");

const QUOTED_TOOL = /"(?<name>[a-z][a-z0-9]*(?:_[a-z0-9]+)+)"/gu;

const ACTION_ID = /\bid: "(?<domain>[a-z-]+)\.(?<verb>[a-zA-Z]+)"/gu;

const CALL_PATH = /"(?<method>GET|POST|PUT|PATCH|DELETE)",\s*[`"](?<path>[^`"?]*)/gu;

const BASE_CALL = /^\$\{base\([^)]*\)\}/u;

const TEMPLATE_PART = /\$\{[^}]*\}/gu;

const PATH_PARAM = /:[A-Za-z]+/gu;

const DIRECTION_BASE = "/api/projects/:/d/:";

const WORD_BREAK = /(?<lower>[a-z0-9])(?<upper>[A-Z])/gu;

const listFiles = (dir) => {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return listFiles(full);
    }

    if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      return [full];
    }

    return [];
  });
};

const textsOf = (dirs) => {
  const texts = [];

  for (const dir of dirs) {
    for (const file of listFiles(path.join(ROOT, dir))) {
      texts.push(readFileSync(file, "utf-8"));
    }
  }

  return texts;
};

const snake = (name) => name.replaceAll(WORD_BREAK, "$<lower>_$<upper>").toLowerCase();

const addSnapshotNames = (names) => {
  for (const file of readdirSync(SNAPSHOTS)) {
    const text = readFileSync(path.join(SNAPSHOTS, file), "utf-8");

    for (const match of text.matchAll(QUOTED_TOOL)) {
      names.add(match.groups.name);
    }
  }
};

const toToolNames = () => {
  const names = new Set();

  for (const text of textsOf(TOOL_DIRS)) {
    for (const match of text.matchAll(QUOTED_TOOL)) {
      names.add(match.groups.name);
    }

    for (const match of text.matchAll(ACTION_ID)) {
      names.add(`${snake(match.groups.verb)}_${match.groups.domain.replaceAll("-", "_")}`);
    }
  }

  addSnapshotNames(names);

  return names;
};

const normalPath = (value) => value.replaceAll(TEMPLATE_PART, ":").replaceAll(PATH_PARAM, ":").replace(/\/$/u, "");

const toServedPaths = () => {
  const paths = new Set();

  for (const text of textsOf(["apps/desktop/src/server/mcp"])) {
    for (const match of text.matchAll(CALL_PATH)) {
      const full = match.groups.path.replace(BASE_CALL, DIRECTION_BASE);

      paths.add(`${match.groups.method} ${normalPath(full)}`);
    }
  }

  return paths;
};

const cache = { paths: null, tools: null };

const isKnownToolName = (name) => {
  if (cache.tools === null) {
    cache.tools = toToolNames();
  }

  return cache.tools.has(name);
};

const isLegacyServedPath = (method, value) => {
  if (cache.paths === null) {
    cache.paths = toServedPaths();
  }

  return cache.paths.has(`${method} ${normalPath(value)}`);
};

export { isKnownToolName, isLegacyServedPath };
