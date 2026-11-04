import path from "node:path";

import type { Project } from "@design-studio/contracts";
import type { InsertComponentRequest } from "@design-studio/contracts/insert";
import { COMPONENT_LIST_MAX } from "@design-studio/contracts/props";
import type {
  ComponentListItem,
  ComponentListQuery,
  ComponentSchemaList,
  ComponentSchema,
  ComponentSource,
  PropSpec,
  PropValue,
} from "@design-studio/contracts/props";

import { importResolver, pickSpecifier } from "./import-plan.js";
import type { ImportNeed } from "./import-plan.js";
import { loadLibrary } from "./insert-list.js";
import type { Library, LibraryEntry } from "./insert-list.js";
import { componentSchemas, loadTypeScript } from "./props-schema.js";

type Ts = NonNullable<Awaited<ReturnType<typeof loadTypeScript>>>;

interface Ranked {
  entry: LibraryEntry;
  source: ComponentSource;
  tier: number;
  local: boolean;
}

const DEFAULT_LIMIT = 40;
const SEEN_MAX = 40;
const ALIAS_LIKE = /^(@\/|~\/|#|@[\w.-]+\/[\w.-]+)/;

const SAFE_ATTR = /^[^"\\{}<>\n]*$/;

function humanize(name: string): string {
  const parts = name.replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2").split(" ");

  return parts
    .map((word, index) => (index === 0 ? word : word.toLowerCase()))
    .join(" ");
}

function attribute(name: string, value: PropValue): string {
  if (value === true) {
    return ` ${name}`;
  }

  if (typeof value === "string" && SAFE_ATTR.test(value)) {
    return ` ${name}="${value}"`;
  }

  return ` ${name}={${JSON.stringify(value)}}`;
}

function requiredValue(spec: PropSpec): PropValue {
  if (spec.default !== undefined) {
    return spec.default;
  }

  if (spec.control === "select") {
    return spec.options?.[0] ?? "";
  }

  if (spec.control === "boolean") {
    return false;
  }

  if (spec.control === "number") {
    return 0;
  }

  return humanize(spec.name.charAt(0).toUpperCase() + spec.name.slice(1));
}

function propsFor(
  schema: ComponentSchema | null,
  given: Record<string, PropValue>
): Record<string, PropValue> {
  const out: Record<string, PropValue> = {};

  for (const spec of schema?.props ?? []) {
    if (
      spec.optional ||
      spec.name === "asChild" ||
      spec.from === "variant" ||
      spec.name in given
    ) {
      continue;
    }

    out[spec.name] = requiredValue(spec);
  }

  for (const [name, value] of Object.entries(given)) {
    if (name !== "children") {
      out[name] = value;
    }
  }

  return out;
}

function childText(text: string): string {
  return /[{}<>]/.test(text) ? `{${JSON.stringify(text)}}` : text;
}

function jsxFor(
  entry: LibraryEntry,
  schema: ComponentSchema | null,
  request: InsertComponentRequest
): string {
  const given = request.props ?? {};

  const attrs = Object.entries(propsFor(schema, given))
    .map(([name, value]) => attribute(name, value))
    .join("");

  if (!entry.children) {
    return `<${entry.name}${attrs} />`;
  }

  const fromProps = typeof given.children === "string" ? given.children : null;

  const text = (request.text ?? fromProps ?? humanize(entry.name))
    .replaceAll(/\s+/g, " ")
    .trim();

  return text
    ? `<${entry.name}${attrs}>${childText(text)}</${entry.name}>`
    : `<${entry.name}${attrs} />`;
}

function sourceOf(library: Library, entry: LibraryEntry): ComponentSource {
  const index = library.scan.findIndex((dir) =>
    entry.absolute.startsWith(dir + path.sep)
  );

  return index !== -1 && index < library.scan.length - 1 ? "package" : "app";
}

function words(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, "");
}

function tierOf(
  entry: LibraryEntry,
  query: string,
  fileText: (file: string) => string
): number {
  if (!query) {
    return 0;
  }

  const name = words(entry.name);

  if (name === query) {
    return 0;
  }

  if (name.startsWith(query)) {
    return 1;
  }

  if (name.includes(query)) {
    return 2;
  }

  if (
    words(entry.folder).includes(query) ||
    words(path.posix.basename(entry.file)).includes(query)
  ) {
    return 3;
  }

  return fileText(entry.absolute).includes(query) ? 4 : -1;
}

function textIndex(library: Library): (file: string) => string {
  const flat = new Map<string, string>();

  return (file) => {
    let text = flat.get(file);

    if (text === undefined) {
      text = words(library.texts.get(file) ?? "");
      flat.set(file, text);
    }

    return text;
  };
}

function rank(library: Library, request: ComponentListQuery): Ranked[] {
  const query = words(request.query ?? "");
  const fileText = textIndex(library);
  const wanted = request.source ?? "all";
  const out: Ranked[] = [];
  const locals = new Set(library.locals);

  for (const entry of [...library.entries, ...library.locals]) {
    const source = sourceOf(library, entry);

    if (wanted !== "all" && source !== wanted) {
      continue;
    }

    const tier = tierOf(entry, query, fileText);

    if (tier >= 0) {
      out.push({ local: locals.has(entry), entry, source, tier });
    }
  }

  return out.sort(
    (a, b) =>
      Number(a.source === "app") - Number(b.source === "app") ||
      a.tier - b.tier ||
      Number(a.local) - Number(b.local) ||
      b.entry.uses - a.entry.uses ||
      a.entry.name.localeCompare(b.entry.name) ||
      a.entry.file.localeCompare(b.entry.file)
  );
}

function offsetOf(cursor: string | undefined): number {
  if (!cursor) {
    return 0;
  }

  const value = Number(cursor);

  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function appTarget(project: Project, library: Library): string {
  const appRoot = library.scan.at(-1) ?? library.root;

  return path.join(
    appRoot,
    project.app?.framework === "next" ? "app" : "",
    "__studio_example__.tsx"
  );
}

function knownSpecifier(
  ts: Ts | null,
  library: Library,
  entry: LibraryEntry,
  need: ImportNeed
): string | null {
  const byFile = library.imports.get(
    entry.kind === "default" ? `default:${entry.local}` : entry.name
  );

  if (!byFile) {
    return null;
  }

  const counts = new Map<string, number>();

  for (const specifier of byFile.values()) {
    counts.set(specifier, (counts.get(specifier) ?? 0) + 1);
  }

  const resolves = importResolver(ts, need);

  for (const [specifier] of [...counts].sort((a, b) => b[1] - a[1])) {
    if (resolves(specifier)) {
      return specifier;
    }
  }

  return null;
}

function seenOf(
  library: Library & { specifiers: Map<string, string[]> }
): ImportNeed["seen"] {
  const out: ImportNeed["seen"] = [];
  const done = new Set<string>();

  for (const [from, list] of library.specifiers) {
    for (const specifier of list) {
      if (out.length >= SEEN_MAX) {
        return out;
      }

      if (done.has(specifier) || !ALIAS_LIKE.test(specifier)) {
        continue;
      }

      done.add(specifier);
      out.push({ from, specifier });
    }
  }

  return out;
}

function importLine(
  ts: Ts | null,
  project: Project,
  library: Library & { specifiers: Map<string, string[]> },
  entry: LibraryEntry
): string {
  const need: ImportNeed = {
    allowPaths: project.app?.framework === "next",
    componentFile: entry.absolute,
    kind: entry.kind,
    name: entry.name,
    root: library.root,
    seen: [],
    targetFile: appTarget(project, library),
  };

  const specifier =
    knownSpecifier(ts, library, entry, need) ??
    pickSpecifier(
      ts,
      { ...need, seen: seenOf(library) },
      importResolver(ts, need)
    );

  return entry.kind === "default"
    ? `import ${entry.name} from '${specifier}';`
    : `import { ${entry.name} } from '${specifier}';`;
}

const IMPORT_LINES_MAX = 5000;
const importLines = new Map<string, string>();

function cachedImportLine(
  ts: Ts | null,
  project: Project,
  library: Library & { specifiers: Map<string, string[]> },
  entry: LibraryEntry
): string {
  const key = `${project.id}:${library.root}:${entry.kind}:${entry.name}:${entry.absolute}`;
  let line = importLines.get(key);

  if (line === undefined) {
    line = importLine(ts, project, library, entry);

    if (importLines.size >= IMPORT_LINES_MAX) {
      importLines.clear();
    }

    importLines.set(key, line);
  }

  return line;
}

function partsOf(library: Library, entry: LibraryEntry): string[] {
  return library.entries
    .filter(
      (other) => other.absolute === entry.absolute && other.name !== entry.name
    )
    .map((other) => other.name);
}

async function searchComponents(
  project: Project,
  workTree: string,
  request: ComponentListQuery
): Promise<ComponentSchemaList> {
  const library = await loadLibrary(project, workTree);
  const ranked = rank(library, request);
  const offset = offsetOf(request.cursor);

  const limit = Math.min(
    Math.max(request.limit ?? DEFAULT_LIMIT, 1),
    COMPONENT_LIST_MAX
  );

  const page = ranked.slice(offset, offset + limit);

  const [ts, schemas] = await Promise.all([
    loadTypeScript(),
    componentSchemas(
      workTree,
      page.map(({ entry }) => ({ file: entry.absolute, name: entry.local }))
    ),
  ]);

  const components: ComponentListItem[] = page.map(
    ({ entry, source, local }, index) => {
      const schema = schemas[index] ?? null;

      const base = schema ?? {
        asChild: false,
        cva: null,
        file: entry.file,
        line: entry.line,
        name: entry.name,
        note: null,
        props: [],
      };

      const example = jsxFor(entry, schema, {
        component: { name: entry.name },
        position: "inside",
        target: { source: null },
      });

      const importText = local
        ? `not exported: use it inside ${entry.file}`
        : cachedImportLine(ts, project, library, entry);

      return {
        ...base,
        example,
        file: entry.file,
        folder: entry.folder,
        import: importText,
        line: entry.line,
        name: entry.name,
        parts: partsOf(library, entry),
        source,
        uses: entry.uses,
      };
    }
  );

  const next = offset + page.length;

  return {
    components,
    nextCursor: next < ranked.length ? String(next) : null,
    total: ranked.length,
    truncated: next < ranked.length,
  };
}

export { humanize, jsxFor, propsFor, searchComponents };
