interface UsageComponent {
  readonly absolute: string;
  readonly file: string;
  readonly isDefault: boolean;
  readonly name: string;
}

interface UsageSite {
  readonly file: string;
  readonly line: number;
}

interface ComponentUse {
  readonly file: string;
  readonly importCount: number;
  readonly name: string;
  readonly routeCount: number;
  readonly samples: readonly UsageSite[];
}

interface UsageInput {
  readonly components: readonly UsageComponent[];
  readonly edges: readonly (readonly [string, readonly string[]])[];
  readonly relativeOf: (absolute: string) => string;
  readonly routeCounts: ReadonlyMap<string, number>;
  readonly texts: ReadonlyMap<string, string>;
}

const MAX_SAMPLES = 3;

const REEXPORT_PATTERN =
  /^export\s+(?:\*|\{[^}]*\})(?:\s+as\s+\w+)?\s+from\s/mu;

const JSX_PATTERN = /<[A-Z][\w.]*[\s/>]/u;

const ESCAPE_PATTERN = /[$()*+.?[\\\]^{|}]/gu;

const toEscaped = (name: string): string =>
  name.replaceAll(ESCAPE_PATTERN, String.raw`\$&`);

const toReverseEdges = (
  edges: UsageInput["edges"]
): ReadonlyMap<string, readonly string[]> => {
  const reverse = new Map<string, string[]>();

  for (const [file, deps] of edges) {
    for (const dep of deps) {
      const known = reverse.get(dep) ?? [];

      known.push(file);
      reverse.set(dep, known);
    }
  }

  return reverse;
};

const isBarrel = (texts: UsageInput["texts"], file: string): boolean => {
  const text = texts.get(file) ?? "";

  return REEXPORT_PATTERN.test(text) && !JSX_PATTERN.test(text);
};

interface ImporterWalk {
  readonly found: string[];
  readonly queue: string[];
  readonly seen: Set<string>;
  readonly texts: UsageInput["texts"];
}

const insertImporter = (walk: ImporterWalk, importer: string): void => {
  if (walk.seen.has(importer)) {
    return;
  }

  walk.seen.add(importer);

  if (isBarrel(walk.texts, importer)) {
    walk.queue.push(importer);

    return;
  }

  walk.found.push(importer);
};

const listImporters = (
  reverse: ReadonlyMap<string, readonly string[]>,
  texts: UsageInput["texts"],
  target: string
): string[] => {
  const walk: ImporterWalk = {
    found: [],
    queue: [target],
    seen: new Set<string>([target]),
    texts,
  };

  while (walk.queue.length > 0) {
    const next = walk.queue.pop() ?? target;

    for (const importer of reverse.get(next) ?? []) {
      insertImporter(walk, importer);
    }
  }

  return walk.found.toSorted();
};

const toLineOf = (text: string, pattern: RegExp): number | null => {
  const rows = text.split("\n");
  const index = rows.findIndex((row) => pattern.test(row));

  if (index === -1) {
    return null;
  }

  return index + 1;
};

const toSiteLine = (text: string, name: string): number => {
  const escaped = toEscaped(name);
  const tag = toLineOf(text, new RegExp(String.raw`<${escaped}(?![\w$])`, "u"));

  if (tag !== null) {
    return tag;
  }

  return (
    toLineOf(
      text,
      new RegExp(String.raw`(?<![\w$])${escaped}(?![\w$])`, "u")
    ) ?? 1
  );
};

const isImporterOf = (component: UsageComponent, text: string): boolean => {
  if (component.isDefault) {
    return true;
  }

  const escaped = toEscaped(component.name);

  return new RegExp(String.raw`(?<![\w$])${escaped}(?![\w$])`, "u").test(text);
};

const toComponentUse = (
  input: UsageInput,
  reverse: ReadonlyMap<string, readonly string[]>,
  component: UsageComponent
): ComponentUse => {
  const importers = listImporters(
    reverse,
    input.texts,
    component.absolute
  ).filter(
    (importer) =>
      importer !== component.absolute &&
      isImporterOf(component, input.texts.get(importer) ?? "")
  );

  const samples = importers.slice(0, MAX_SAMPLES).map((importer) => ({
    file: input.relativeOf(importer),
    line: toSiteLine(input.texts.get(importer) ?? "", component.name),
  }));

  return {
    file: component.file,
    importCount: importers.length,
    name: component.name,
    routeCount: input.routeCounts.get(component.absolute) ?? 0,
    samples,
  };
};

const toRank = (left: ComponentUse, right: ComponentUse): number => {
  if (left.importCount !== right.importCount) {
    return right.importCount - left.importCount;
  }

  return left.name.localeCompare(right.name);
};

const toComponentUses = (input: UsageInput): ComponentUse[] => {
  const reverse = toReverseEdges(input.edges);

  return input.components
    .map((component) => toComponentUse(input, reverse, component))
    .toSorted(toRank);
};

export { toComponentUses };

export type { ComponentUse, UsageComponent, UsageInput, UsageSite };
