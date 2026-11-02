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
import { isObject, parseText } from "./stamp/call-types.js";
import type {
  CallableAction,
  Context,
  Fields,
  Surface,
  SurfaceResult,
} from "./stamp/call-types.js";

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

const TOKEN_META = /<meta name="studio-token" content="(?<token>[^"]*)">/u;

const USAGE =
  "pnpm exec tsx scripts/call-action.ts <action id> '<json>' [--port N]";

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
    "src/shared/actions/index.ts"
  );

  const found = Object.values(AllActions)
    .flatMap((group) => Object.values(group))
    .find((action) => action.id === id);

  if (!found) {
    return fail(`No action has the id ${id}.`, USAGE);
  }

  return found;
};

const fetchHome = async (base: string): Promise<string> => {
  try {
    const res = await fetch(`${base}/`);
    const html = await res.text();

    return html;
  } catch {
    return fail(`No studio answers at ${base}.`, START);
  }
};

const readToken = async (base: string): Promise<string> => {
  const html = await fetchHome(base);

  return TOKEN_META.exec(html)?.groups?.token ?? "";
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

const callSurfaces = async (context: Context): Promise<SurfaceResult[]> => {
  const http = await safely("http", () => callHttp(context));
  const mcp = await safely("mcp", () => callMcp(context));
  const agent = await safely("agent", () => callAgent(context));

  return [http, mcp, agent];
};

const report = (
  context: Context,
  results: readonly SurfaceResult[],
  answered: readonly string[]
): boolean => {
  const failed = results.filter((result) => "error" in result).length;
  const diffs = diffOutcomes(results.filter((result) => isOutcome(result)));
  const isFailed = diffs.length + failed > 0;
  const verdict = (isFailed && "fail") || "pass";

  const lines = [
    ...results.map((result) => formatResult(result)),
    ...diffs,
    `answered approval cards: ${answered.join(", ") || "none"}`,
    `call-action: ${verdict}, ${diffs.length} diffs, ${failed} failed surfaces`,
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
    `call-action ${action.id} on ${base}. The agent path runs in this process on the STUDIO_DATA_DIR of this shell.\n\n`
  );

  const results = await callSurfaces(context);

  await approver.stop();

  const isFailed = report(context, results, approver.answered);

  process.exitCode = Number(isFailed);
};

await runCli(main);
