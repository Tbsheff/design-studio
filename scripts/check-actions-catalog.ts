import {
  e16Hits,
  firstOf,
  loadModule,
  nameOf,
  opHit,
  permissionHits,
  snapshotHits,
} from "./check-actions-names.js";
import type {
  Binding,
  Catalog,
  Hit,
  OpRow,
  RuleText,
  SchemaLike,
} from "./check-actions-names.js";

interface OpCheck {
  readonly bad: (row: OpRow) => string | null;
  readonly rule: RuleText;
  readonly warn: boolean;
}

interface Unique {
  readonly keyFor: (row: OpRow) => string | null;
  readonly rule: RuleText;
}

interface OpReport {
  readonly problems: Hit[];
  readonly warnings: Hit[];
}

interface OpFlags {
  readonly catalog: string;
  readonly warnStub: boolean;
}

const DEFAULT_CATALOG = "src/shared/actions/index.ts";

const OFF_REASONS = new Set([
  "run-control",
  "secret",
  "stream",
  "ui-bootstrap",
]);

const TOOL_NAME = /^[a-z][a-z0-9_]*$/u;

const MAX_NAME = 64;

const DESCRIPTION_MIN = 20;

const DESCRIPTION_MAX = 600;

const SHORT_MIN = 20;

const SHORT_MAX = 160;

const RUN_CONTROL = /^(?:start|steer|stop)/u;

const SECRET_FIELD = /(?:token|key)s?$/iu;

const ARRAY_TAGS = new Set(["Arrays", "TupleType"]);

const STUB = "NotImplemented";

const STUB_RULE = "O10";

const CATALOG_FLAG = "--catalog=";

const kebab = (name: string): string =>
  name.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);

const rowsOf = (catalog: Catalog): OpRow[] =>
  Object.entries(catalog).flatMap(([context, group]) =>
    Object.entries(group).map(([opKey, definition]) => ({
      ctx: context,
      file: `src/shared/actions/${kebab(context)}/${kebab(opKey)}.ts`,
      key: opKey,
      op: definition,
    }))
  );

const formatHit = (hit: Hit): string =>
  `${hit.rule} ${hit.file} ${hit.what}. fix: ${hit.fix}`;

const UNIQUE: Unique[] = [
  {
    keyFor: (row) => row.op.id,
    rule: {
      fix: "give the op a unique <ctx>.<opKey> id",
      id: "O1",
      what: "an op id is not unique",
    },
  },
  {
    keyFor: (row) => `${row.op.http.method} ${row.op.http.path}`,
    rule: {
      fix: "change --method or --path",
      id: "O2",
      what: "an op method and path pair is not unique",
    },
  },
  {
    keyFor: (row) => nameOf(row.op.mcp),
    rule: {
      fix: "pick another --mcp name",
      id: "O3",
      what: "an op MCP name is not unique",
    },
  },
  {
    keyFor: (row) => nameOf(row.op.agent),
    rule: {
      fix: "pick another --agent name",
      id: "O4",
      what: "an op agent name is not unique",
    },
  },
];

const dupeHits = (rows: OpRow[], unique: Unique): Hit[] => {
  const seen = new Map<string, string>();

  const hits: Hit[] = [];

  for (const row of rows) {
    const key = unique.keyFor(row) ?? "";

    const first = seen.get(key);

    if (key === "") {
      seen.delete(key);
    } else if (first) {
      hits.push(opHit(unique.rule, row, `${key} (also ${first})`));
    } else {
      seen.set(key, row.op.id);
    }
  }

  return hits;
};

const textProblem = (
  text: string | null,
  min: number,
  max: number
): string | null => {
  if (text === null) {
    return "is missing";
  }

  if (text.length < min || text.length > max) {
    return `is ${text.length} chars`;
  }

  if (text.includes("TODO")) {
    return "has TODO";
  }

  return null;
};

const badName = (binding: Binding): string | null => {
  const name = nameOf(binding);

  if (name === null || (TOOL_NAME.test(name) && name.length <= MAX_NAME)) {
    return null;
  }

  return name;
};

const badOff = (binding: Binding): string | null => {
  const off = binding.off ?? null;

  if (off === null || OFF_REASONS.has(off)) {
    return null;
  }

  return off;
};

const fieldsOf = (schema: SchemaLike): Readonly<Record<string, SchemaLike>> =>
  schema.fields ?? {};

const isArray = (schema: SchemaLike): boolean =>
  ARRAY_TAGS.has(schema.ast?._tag ?? "");

const secretField = (row: OpRow): string | null => {
  if (row.op.mcp.off !== "secret" && row.op.agent.off !== "secret") {
    return null;
  }

  const field = Object.keys(fieldsOf(row.op.output)).find((key) =>
    SECRET_FIELD.test(key)
  );

  return field ?? null;
};

const unpagedList = (row: OpRow): string | null => {
  const arrays = Object.entries(fieldsOf(row.op.output)).flatMap(
    ([key, schema]) => {
      if (isArray(schema)) {
        return [key];
      }

      return [];
    }
  );

  const paged = "limit" in fieldsOf(row.op.input);

  if (isArray(row.op.output) || (arrays.length > 0 && !paged)) {
    return `output ${arrays.join(", ") || "array"} has no limit input`;
  }

  return null;
};

const hasStub = (row: OpRow): string | null => {
  if (row.op.errors.some((error) => error.name === STUB)) {
    return `lists ${STUB}`;
  }

  return null;
};

const runControl = (row: OpRow): string | null => {
  const controls = row.ctx === "runs" && RUN_CONTROL.test(row.key);

  if (!controls || row.op.mcp.off === "run-control") {
    return null;
  }

  return `${row.key} has mcp ${row.op.mcp.name ?? row.op.mcp.off ?? "unset"}`;
};

const noInvalidates = (row: OpRow): string | null => {
  if (row.op.access === "edit" && (row.op.invalidates ?? []).length === 0) {
    return "has invalidates []";
  }

  return null;
};

const shortProblem = (row: OpRow): string | null => {
  if (nameOf(row.op.agent) === null) {
    return null;
  }

  return textProblem(row.op.agent.short ?? null, SHORT_MIN, SHORT_MAX);
};

const OP_CHECKS: OpCheck[] = [
  {
    bad: (row) => firstOf(badName(row.op.mcp), badName(row.op.agent)),
    rule: {
      fix: "use snake_case, 64 chars max",
      id: "O5",
      what: "an MCP or agent name is not snake_case or is too long",
    },
    warn: false,
  },
  {
    bad: (row) =>
      textProblem(row.op.description, DESCRIPTION_MIN, DESCRIPTION_MAX),
    rule: {
      fix: "write a 20 to 600 char STE description with no TODO",
      id: "O6",
      what: "an op description is out of bounds",
    },
    warn: false,
  },
  {
    bad: shortProblem,
    rule: {
      fix: "write a 20 to 160 char agent.short with no TODO",
      id: "O7",
      what: "an agent.short is out of bounds",
    },
    warn: false,
  },
  {
    bad: (row) => firstOf(badOff(row.op.mcp), badOff(row.op.agent)),
    rule: {
      fix: "use run-control, secret, stream or ui-bootstrap",
      id: "O8",
      what: "an off reason is not in the closed set",
    },
    warn: false,
  },
  {
    bad: runControl,
    rule: {
      fix: 'set mcp: { off: "run-control" }',
      id: "O9",
      what: "a runs start, steer or stop op is on MCP",
    },
    warn: false,
  },
  {
    bad: hasStub,
    rule: {
      fix: `build the handler and remove ${STUB} from errors`,
      id: STUB_RULE,
      what: "an op is still a stub",
    },
    warn: false,
  },
  {
    bad: secretField,
    rule: {
      fix: "drop the token or key field from the output",
      id: "O11",
      what: "a secret op output has a token or key field",
    },
    warn: false,
  },
  {
    bad: unpagedList,
    rule: {
      fix: "use --list: PageFields input and pageOf output from actions/_core/list-page.ts",
      id: "O12",
      what: "an array output has no limit input",
    },
    warn: false,
  },
  {
    bad: noInvalidates,
    rule: {
      fix: "add the op ids this edit makes stale to invalidates",
      id: "O13",
      what: "an edit op invalidates nothing",
    },
    warn: true,
  },
];

const checkHits = (rows: OpRow[], check: OpCheck): Hit[] =>
  rows.flatMap((row) => {
    const detail = check.bad(row);

    if (detail === null) {
      return [];
    }

    return [opHit(check.rule, row, detail)];
  });

const opReport = async (rows: OpRow[], flags: OpFlags): Promise<OpReport> => {
  const checks = OP_CHECKS.map((check) => ({
    bad: check.bad,
    rule: check.rule,
    warn: check.warn || (flags.warnStub && check.rule.id === STUB_RULE),
  }));

  const later = await Promise.all([
    e16Hits(rows),
    snapshotHits(rows),
    permissionHits(rows),
  ]);

  const failing = checks.filter((check) => !check.warn);

  const warning = checks.filter((check) => check.warn);

  return {
    problems: [
      ...UNIQUE.flatMap((unique) => dupeHits(rows, unique)),
      ...failing.flatMap((check) => checkHits(rows, check)),
      ...later.flat(),
    ],
    warnings: warning.flatMap((check) => checkHits(rows, check)),
  };
};

const opFlags = (argv: readonly string[]): OpFlags => {
  const catalog = argv.find((arg) => arg.startsWith(CATALOG_FLAG));

  return {
    catalog: catalog?.slice(CATALOG_FLAG.length) ?? DEFAULT_CATALOG,
    warnStub: argv.includes("--warn-stub"),
  };
};

const checkOps = async (argv: readonly string[]): Promise<number> => {
  const flags = opFlags(argv);

  const catalog = await loadModule<{ AllActions: Catalog }>(flags.catalog);

  const rows = rowsOf(catalog.AllActions);

  const { problems, warnings } = await opReport(rows, flags);

  const failed = problems.length > 0;

  let verdict = "pass";

  if (failed) {
    verdict = "fail";
  }

  const lines = [
    ...warnings.map((hit) => `warning: ${formatHit(hit)}`),
    ...problems.map((hit) => formatHit(hit)),
    `check-actions --ops: ${verdict}, ${rows.length} ops, ${warnings.length} warnings`,
  ];

  process.stdout.write(`${lines.join("\n")}\n`);

  return Number(failed);
};

const runChecks = async (
  scan: () => Promise<number>,
  argv: readonly string[]
): Promise<number> => {
  let scanned = 0;

  if (!argv.includes("--ops")) {
    scanned = await scan();
  }

  return Math.max(scanned, await checkOps(argv));
};

export { runChecks };
