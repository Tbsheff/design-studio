import { fail, runCli } from "./stamp/args.js";
import { callAgent, importSource } from "./stamp/call-agent.js";
import { callHttp } from "./stamp/call-http.js";
import { callMcp } from "./stamp/call-mcp.js";
import {
  diffOutcomes,
  formatResult,
  isOutcome,
  startApprover,
} from "./stamp/call-report.js";
import { getUndoCount, runReset, toResetTarget } from "./stamp/call-reset.js";
import type { ResetTarget } from "./stamp/call-reset.js";
import { isObject, parseText } from "./stamp/call-types.js";
import type {
  CallableAction,
  Context,
  Fields,
  Surface,
  SurfaceResult,
} from "./stamp/call-types.js";
import { toStudioToken } from "./studio-session.js";

interface Options {
  readonly id: string;
  readonly input: Fields;
  readonly port: number;
}

type ActionGroups = Readonly<
  Record<string, Readonly<Record<string, CallableAction>>>
>;

interface ActionsModule {
  readonly AllActions: ActionGroups;
}

const DEFAULT_PORT = 4170;

const VIEWER_PORT = 4570;

const TOOL_PORT = 4590;

const RESERVED_PORTS: ReadonlySet<number> = new Set([VIEWER_PORT, TOOL_PORT]);

const USAGE =
  "pnpm exec tsx apps/desktop/scripts/call-action.ts <action id> '<json>' [--port N]";

const START =
  "STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev, then run call-action with the same STUDIO_DATA_DIR";

const parseInput = (text: string): Fields => {
  const parsed = parseText(text);

  if (!isObject(parsed)) {
    return fail(`The input must be one JSON object: ${text}`, USAGE);
  }

  return parsed;
};

const parsePort = (args: readonly string[]): number => {
  const at = args.indexOf("--port");

  if (at === -1) {
    return DEFAULT_PORT;
  }

  const port = Number(args[at + 1]);

  if (!Number.isInteger(port) || port <= 0) {
    return fail("The flag --port needs a port number.", USAGE);
  }

  if (RESERVED_PORTS.has(port)) {
    return fail(`Port ${port} is reserved. Use the dev studio port.`, USAGE);
  }

  return port;
};

const parseOptions = (args: readonly string[]): Options => {
  const [id, json] = args;

  if (!id || id.startsWith("--")) {
    return fail("Give an action id, for example studio.health.", USAGE);
  }

  let input: Fields = {};

  if (json && !json.startsWith("--")) {
    input = parseInput(json);
  }

  const port = parsePort(args);

  return { id, input, port };
};

const loadAction = async (id: string): Promise<CallableAction> => {
  const { AllActions } = await importSource<ActionsModule>(
    "packages/common/actions/src/index.ts"
  );

  const found = Object.values(AllActions)
    .flatMap((group) => Object.values(group))
    .find((action) => action.id === id);

  if (!found) {
    return fail(`No action has the id ${id}.`, USAGE);
  }

  return found;
};

const readToken = async (base: string): Promise<string> => {
  try {
    const res = await fetch(`${base}/`);

    if (!res.ok) {
      return fail(`The studio at ${base} answered ${res.status}.`, START);
    }

    await res.arrayBuffer();
  } catch {
    return fail(`No studio answers at ${base}.`, START);
  }

  try {
    return await toStudioToken(base, null);
  } catch (error) {
    return fail(`No studio token from ${base}: ${String(error)}`, START);
  }
};

const safely = async (
  surface: Surface,
  run: () => Promise<SurfaceResult>
): Promise<SurfaceResult> => {
  try {
    return await run();
  } catch (error) {
    return { error: String(error), surface };
  }
};

interface SurfaceRun {
  readonly results: SurfaceResult[];
  readonly resets: string[];
  readonly isResetFailed: boolean;
}

interface SurfaceStep {
  readonly call: (context: Context) => Promise<SurfaceResult>;
  readonly surface: Surface;
}

const SURFACE_STEPS: readonly SurfaceStep[] = [
  { call: callHttp, surface: "http" },
  { call: callMcp, surface: "mcp" },
  { call: callAgent, surface: "agent" },
];

const RESET_SKIP = "the reset after an earlier surface failed";

interface ResetPoint {
  readonly start: number;
  readonly target: ResetTarget;
}

const runResetAfter = async (
  context: Context,
  reset: ResetPoint | null,
  surface: Surface
): Promise<{ readonly isFailed: boolean; readonly lines: string[] }> => {
  if (reset === null) {
    return { isFailed: false, lines: [] };
  }

  const after = await runReset(context, reset.target, reset.start);

  return { isFailed: after.isFailed, lines: [`[${surface}] ${after.line}`] };
};

const runWithReset = async (
  context: Context,
  steps: readonly SurfaceStep[],
  reset: ResetPoint | null,
  done: SurfaceRun
): Promise<SurfaceRun> => {
  const [step, ...rest] = steps;

  if (!step) {
    return done;
  }

  if (done.isResetFailed) {
    const skipped: SurfaceResult = {
      reason: RESET_SKIP,
      surface: step.surface,
    };

    return runWithReset(context, rest, reset, {
      ...done,
      results: [...done.results, skipped],
    });
  }

  const result = await safely(step.surface, () => step.call(context));
  const after = await runResetAfter(context, reset, step.surface);

  return runWithReset(context, rest, reset, {
    isResetFailed: after.isFailed,
    resets: [...done.resets, ...after.lines],
    results: [...done.results, result],
  });
};

const toResetPoint = async (context: Context): Promise<ResetPoint | null> => {
  const target = toResetTarget(context);

  if (target === null) {
    return null;
  }

  const start = await getUndoCount(context, target);

  return { start, target };
};

const callSurfaces = async (context: Context): Promise<SurfaceRun> =>
  runWithReset(context, SURFACE_STEPS, await toResetPoint(context), {
    isResetFailed: false,
    resets: [],
    results: [],
  });

const report = (
  context: Context,
  run: SurfaceRun,
  answered: readonly string[]
): boolean => {
  const { results } = run;
  const failed = results.filter((result) => "error" in result).length;
  const outcomes = results.filter((result) => isOutcome(result));
  const errors = outcomes.filter((outcome) => outcome.isError).length;
  const diffs = diffOutcomes(outcomes);
  const isBroken = diffs.length + failed + errors > 0;
  const isFailed = isBroken || outcomes.length === 0 || run.isResetFailed;
  const verdict = (isFailed && "fail") || "pass";

  const lines = [
    ...results.map((result) => formatResult(result)),
    ...diffs,
    ...run.resets,
    `answered approval cards: ${answered.join(", ") || "none"}`,
    `call-action: ${verdict}, ${outcomes.length} surfaces ran, ${diffs.length} diffs, ${failed} failed surfaces, ${errors} error results`,
  ];

  if (isFailed) {
    lines.push(
      `fix: compare the outputs above, then run call-action again with the id ${context.action.id} and the same input`
    );
  }

  process.stdout.write(`${lines.join("\n\n")}\n`);

  return isFailed;
};

const main = async (): Promise<void> => {
  const options = parseOptions(process.argv.slice(2));
  const action = await loadAction(options.id);
  const base = `http://127.0.0.1:${options.port}`;
  const token = await readToken(base);
  const { input } = options;
  const context: Context = { action, base, input, token };
  const approver = startApprover(context);

  process.stdout.write(
    `call-action ${action.id} on ${base}. The agent path runs in the studio through its agent tool route (STUDIO_AGENT=mock). The MCP path reads its token from the STUDIO_DATA_DIR of this shell.\n\n`
  );

  const run = await callSurfaces(context);

  await approver.stop();

  const isFailed = report(context, run, approver.answered);

  process.exitCode = Number(isFailed);
};

await runCli(main);
