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

const SERVICE_FILE = /extends Context\.Service</u;

const toServiceFiles = () =>
  new Set(
    listTs(SERVER).filter((file) => SERVICE_FILE.test(readFileSync(file, "utf-8")))
  );

const cache = {
  actionAccess: new Map(),
  domains: null,
  legacyTools: null,
  serviceAccess: null,
  serviceFiles: null,
  serviceUses: null,
  sources: new Map(),
  wireErrors: null,
  writeSites: new Map(),
};

const isServiceFilePath = (file) => {
  if (cache.serviceFiles === null) {
    cache.serviceFiles = toServiceFiles();
  }

  return cache.serviceFiles.has(file);
};

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

const readSource = (relative) => {
  const file = path.join(ROOT, relative);

  if (!existsSync(file)) {
    return null;
  }

  return readFileSync(file, "utf-8");
};

const sourceOf = (relative) => {
  if (!cache.sources.has(relative)) {
    cache.sources.set(relative, readSource(relative));
  }

  return cache.sources.get(relative);
};

const SNAPSHOTS = path.join(ROOT, "artifacts/mcp-snapshots");

const LEGACY_ORDER = path.join(ROOT, "src/server/mcp/legacy/order.ts");

const QUOTED_NAME = /"(?<name>[a-z][a-z0-9_]*)"/gu;

const collectNames = (value, names) => {
  if (!(value instanceof Object)) {
    return;
  }

  if (!Array.isArray(value) && value.name === String(value.name)) {
    names.add(value.name);
  }

  for (const item of Object.values(value)) {
    collectNames(item, names);
  }
};

const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));

const toLegacyToolNames = () => {
  const names = new Set();

  for (const file of readdirSync(SNAPSHOTS)) {
    collectNames(readJson(path.join(SNAPSHOTS, file)), names);
  }

  for (const match of readFileSync(LEGACY_ORDER, "utf-8").matchAll(QUOTED_NAME)) {
    names.add(match.groups.name);
  }

  return names;
};

const isLegacyToolName = (name) => {
  if (cache.legacyTools === null) {
    cache.legacyTools = toLegacyToolNames();
  }

  return cache.legacyTools.has(name);
};

const SERVICE_NAME = /class (?<name>[A-Z]\w*) extends Context\.Service</gu;

const toServiceUses = () => {
  const counts = new Map();
  const files = listTs(SERVER).filter((file) => !file.endsWith(".test.ts"));
  const texts = files.map((file) => readFileSync(file, "utf-8"));

  for (const text of texts) {
    for (const match of text.matchAll(SERVICE_NAME)) {
      counts.set(match.groups.name, 0);
    }
  }

  for (const name of counts.keys()) {
    const word = new RegExp(`\\b${name}\\b`, "u");
    counts.set(name, texts.filter((text) => word.test(text)).length);
  }

  return counts;
};

const serviceFileCountOf = (name) => {
  if (cache.serviceUses === null) {
    cache.serviceUses = toServiceUses();
  }

  return cache.serviceUses.get(name) ?? 0;
};

const TAGGED_ERROR = /class (?<name>[A-Z]\w*) extends Schema\.TaggedError/gu;

const toWireErrorNames = () =>
  new Set(
    listTs(ACTIONS).flatMap((file) =>
      [...readFileSync(file, "utf-8").matchAll(TAGGED_ERROR)].map((match) => match.groups.name)
    )
  );

const isWireErrorName = (name) => {
  if (cache.wireErrors === null) {
    cache.wireErrors = toWireErrorNames();
  }

  return cache.wireErrors.has(name);
};

const TABLE_FILES = new Set(["index.ts", "routes.ts", "schema.ts"]);

const hasDefinition = (folder) =>
  readdirSync(path.join(ACTIONS, folder)).some(
    (name) => name.endsWith(".ts") && !TABLE_FILES.has(name)
  );

const toDomainFolders = () => {
  const folders = new Set();

  for (const entry of readdirSync(ACTIONS, { withFileTypes: true })) {
    const isDomain = entry.isDirectory() && !entry.name.startsWith("_");

    if (isDomain && hasDefinition(entry.name)) {
      folders.add(entry.name);
    }
  }

  return folders;
};

const isDomainFolder = (name) => {
  if (cache.domains === null) {
    cache.domains = toDomainFolders();
  }

  return cache.domains.has(name);
};

const WRITE_CALL =
  /\b(?:appendFile|copyFile|execFile|mkdir|rename|rm|rmdir|screenshot|spawn|unlink|writeFile)\s*\(/u;

const NAMED_IMPORT = /^import \{(?<names>[^}]+)\} from "(?<source>\.\/[^"/]+)\.js";/gmu;

const TOP_LEVEL = /\n(?=(?:export )?(?:async function|class|const|function) )/u;

const DECLARED = /^(?:export )?(?:async function|class|const|function) (?<name>[A-Za-z_$][\w$]*)/u;

const toChunks = (file) => {
  const chunks = new Map();

  if (!existsSync(file)) {
    return chunks;
  }

  for (const chunk of readFileSync(file, "utf-8").split(TOP_LEVEL)) {
    const name = DECLARED.exec(chunk.trim())?.groups.name ?? null;

    if (name !== null) {
      chunks.set(name, chunk);
    }
  }

  return chunks;
};

const writesThrough = (chunks, name, seen) => {
  const chunk = chunks.get(name) ?? null;

  if (chunk === null || seen.has(name)) {
    return false;
  }

  seen.add(name);

  if (WRITE_CALL.test(chunk)) {
    return true;
  }

  return [...chunks.keys()].some(
    (other) => new RegExp(`\\b${other}\\b`, "u").test(chunk) && writesThrough(chunks, other, seen)
  );
};

const importedNames = (names) =>
  names
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "" && !part.startsWith("type "))
    .map((part) => part.split(" as ")[0].trim());

const writeSiteOf = (file) => {
  const text = readFileSync(file, "utf-8");

  if (WRITE_CALL.test(text)) {
    return file;
  }

  for (const match of text.matchAll(NAMED_IMPORT)) {
    const target = path.join(path.dirname(file), `${match.groups.source}.ts`);
    const chunks = toChunks(target);

    if (importedNames(match.groups.names).some((name) => writesThrough(chunks, name, new Set()))) {
      return target;
    }
  }

  return null;
};

const writeSiteFrom = (file) => {
  if (!cache.writeSites.has(file)) {
    cache.writeSites.set(file, writeSiteOf(file));
  }

  return cache.writeSites.get(file);
};

export {
  actionAccessOf,
  isDomainFolder,
  isLegacyToolName,
  isServiceFilePath,
  isWireErrorName,
  relativeOf,
  serviceAccessOf,
  serviceFileCountOf,
  sourceOf,
  writeSiteFrom,
};
