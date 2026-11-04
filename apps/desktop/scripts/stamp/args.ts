type FlagKind = "boolean" | "list" | "string";

interface FlagSpec {
  readonly kind: FlagKind;
  readonly required: boolean;
}

interface ArgsSpec {
  readonly command: string;
  readonly flags: Readonly<Record<string, FlagSpec>>;
  readonly positionals: readonly string[];
}

interface ParsedArgs {
  readonly booleans: ReadonlySet<string>;
  readonly lists: ReadonlyMap<string, readonly string[]>;
  readonly positionals: readonly string[];
  readonly strings: ReadonlyMap<string, string>;
}

interface Collected {
  readonly booleans: Set<string>;
  readonly lists: Map<string, string[]>;
  readonly positionals: string[];
  readonly strings: Map<string, string>;
}

class StampRefusedError extends Error {
  public readonly fix: string;

  public constructor(message: string, fix: string) {
    super(message);
    this.name = "StampRefusedError";
    this.fix = fix;
  }
}

const fail = (message: string, fix: string): never => {
  throw new StampRefusedError(message, fix);
};

const runCli = async (main: () => Promise<void>): Promise<void> => {
  try {
    await main();
  } catch (error) {
    if (!(error instanceof StampRefusedError)) {
      throw error;
    }

    process.stderr.write(`${error.message}\nfix: ${error.fix}\n`);
    process.exitCode = 1;
  }
};

const toRequiredFlag = (spec: ArgsSpec, name: string): string[] => {
  if (spec.flags[name]?.required) {
    return [`--${name} <value>`];
  }

  return [];
};

const usage = (spec: ArgsSpec): string =>
  [
    spec.command,
    ...spec.positionals.map((name) => `<${name}>`),
    ...Object.keys(spec.flags).flatMap((name) => toRequiredFlag(spec, name)),
  ].join(" ");

const splitList = (value: string): string[] =>
  value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");

const takeValue = (
  spec: ArgsSpec,
  name: string,
  value: string | null
): string => {
  if (value === null || value.startsWith("--")) {
    return fail(`The flag --${name} needs a value.`, usage(spec));
  }

  return value;
};

const storeFlag = (
  spec: ArgsSpec,
  found: Collected,
  name: string,
  value: string | null
): number => {
  const flag = spec.flags[name] ?? null;

  if (flag === null) {
    return fail(`The flag --${name} is not known.`, usage(spec));
  }

  if (flag.kind === "boolean") {
    found.booleans.add(name);

    return 0;
  }

  const given = takeValue(spec, name, value);

  if (flag.kind === "list") {
    found.lists.set(name, [
      ...(found.lists.get(name) ?? []),
      ...splitList(given),
    ]);
  } else {
    found.strings.set(name, given);
  }

  return 1;
};

const collect = (spec: ArgsSpec, argv: readonly string[]): Collected => {
  const found: Collected = {
    booleans: new Set(),
    lists: new Map(),
    positionals: [],
    strings: new Map(),
  };

  let index = 0;

  while (index < argv.length) {
    const arg = argv[index] ?? "";

    if (arg.startsWith("--")) {
      index += storeFlag(spec, found, arg.slice(2), argv[index + 1] ?? null);
    } else {
      found.positionals.push(arg);
    }

    index += 1;
  }

  return found;
};

const checkRequired = (spec: ArgsSpec, found: Collected): void => {
  if (found.positionals.length !== spec.positionals.length) {
    fail(
      `The command needs ${String(spec.positionals.length)} arguments: ${spec.positionals.join(", ")}.`,
      usage(spec)
    );
  }

  for (const [name, flag] of Object.entries(spec.flags)) {
    const isGiven = found.strings.has(name) || found.lists.has(name);

    if (flag.required && !isGiven) {
      fail(`The flag --${name} is missing.`, usage(spec));
    }
  }
};

const parseArgs = (spec: ArgsSpec, argv: readonly string[]): ParsedArgs => {
  const found = collect(spec, argv);

  checkRequired(spec, found);

  return found;
};

const optional = (kind: FlagKind): FlagSpec => ({ kind, required: false });

const must = (kind: FlagKind): FlagSpec => ({ kind, required: true });

const stringFlag = (args: ParsedArgs, name: string): string | null =>
  args.strings.get(name) ?? null;

const listFlag = (args: ParsedArgs, name: string): readonly string[] =>
  args.lists.get(name) ?? [];

const hasFlag = (args: ParsedArgs, name: string): boolean =>
  args.booleans.has(name);

export {
  StampRefusedError,
  fail,
  hasFlag,
  listFlag,
  must,
  optional,
  parseArgs,
  runCli,
  stringFlag,
  usage,
};

export type { ArgsSpec, FlagKind, FlagSpec, ParsedArgs };
