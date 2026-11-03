import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const SERVER = path.join(ROOT, "src/server");

const ACTIONS = path.join(ROOT, "src/shared/actions");

const SERVICE_CLASS =
  /class (?<name>[A-Z]\w*) extends Context\.Service<[\s\S]*?declare public readonly access: "(?<access>read|write)"/gu;

const ACCESS_FIELD = /^ {2}access: "(?<access>[a-z]+)"/mu;

const SKIP_DIRS = new Set(["node_modules", "templates"]);

const listTs = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        return [];
      }

      return listTs(full);
    }

    if (entry.name.endsWith(".ts")) {
      return [full];
    }

    return [];
  });

const toServiceAccess = () => {
  const access = new Map();

  for (const file of listTs(SERVER)) {
    const text = readFileSync(file, "utf-8");

    for (const match of text.matchAll(SERVICE_CLASS)) {
      access.set(match.groups.name, match.groups.access);
    }
  }

  return access;
};

const cache = { actionAccess: new Map(), serviceAccess: null };

const serviceAccessOf = (name) => {
  if (cache.serviceAccess === null) {
    cache.serviceAccess = toServiceAccess();
  }

  return cache.serviceAccess.get(name) ?? null;
};

const readActionAccess = (domain, tail) => {
  const file = path.join(ACTIONS, domain, `${tail}.ts`);

  if (!existsSync(file)) {
    return null;
  }

  const match = ACCESS_FIELD.exec(readFileSync(file, "utf-8"));

  if (match === null) {
    return null;
  }

  return match.groups.access;
};

const actionAccessOf = (domain, tail) => {
  const key = `${domain}/${tail}`;

  if (!cache.actionAccess.has(key)) {
    cache.actionAccess.set(key, readActionAccess(domain, tail));
  }

  return cache.actionAccess.get(key);
};

const relativeOf = (filename) =>
  path.relative(ROOT, filename).split(path.sep).join("/");

export { actionAccessOf, relativeOf, serviceAccessOf };
