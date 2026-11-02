import { createRequire, syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { tool } from "@anthropic-ai/claude-agent-sdk";

import { firstText, parseText, timed } from "./call-types.js";
import type {
  CallableAction,
  Context,
  Fields,
  SurfaceResult,
  TextResult,
} from "./call-types.js";

interface SpawnResult {
  readonly pid?: number;
}

type SpawnFn = (command: string, ...rest: readonly Fields[]) => SpawnResult;

type SpawnKey =
  | "exec"
  | "execFile"
  | "execFileSync"
  | "execSync"
  | "spawn"
  | "spawnSync";

type ChildProcessModule = Record<SpawnKey, SpawnFn>;

interface Counter {
  count: number;
}

interface SpawnCounter {
  readonly read: () => number;
  readonly stop: () => void;
}

interface HandlerExtra {
  readonly signal?: AbortSignal;
}

interface AgentTool {
  readonly handler: (args: Fields, extra: HandlerExtra) => Promise<TextResult>;
  readonly name: string;
}

interface StudioRuntimeHandle {
  readonly dispose: () => Promise<void>;
}

type CallById = (action: CallableAction, args: Fields) => Promise<TextResult>;

interface RuntimeModule {
  readonly buildRuntime: () => StudioRuntimeHandle;
  readonly disposeRuntime: (runtime: StudioRuntimeHandle) => Promise<void>;
}

interface McpRegistryModule {
  readonly actionCaller: (runtime: StudioRuntimeHandle) => CallById | null;
}

interface AgentRegistryModule {
  readonly buildAgentTools: (
    call: CallById | null,
    toolFn: typeof tool
  ) => AgentTool[];
}

interface LoadedAgent {
  readonly dispose: () => Promise<void>;
  readonly tools: readonly AgentTool[];
}

const ROOT = path.join(import.meta.dirname, "..", "..");

const GIT_NAME = /(?:^|[\\/])git(?:\.exe)?$/u;

const SPAWN_KEYS: readonly SpawnKey[] = [
  "exec",
  "execFile",
  "execFileSync",
  "execSync",
  "spawn",
  "spawnSync",
];

const importSource = async <Module>(relative: string): Promise<Module> => {
  const loaded = (await import(
    pathToFileURL(path.join(ROOT, relative)).href
  )) as Module;

  return loaded;
};

const countingSpawn =
  (original: SpawnFn, counter: Counter): SpawnFn =>
  (command, ...rest) => {
    if (GIT_NAME.test(String(command))) {
      counter.count += 1;
    }

    return original(command, ...rest);
  };

const countGitSpawns = (): SpawnCounter => {
  const require = createRequire(import.meta.url);
  const childProcess = require("node:child_process") as ChildProcessModule;
  const originals = SPAWN_KEYS.map((key) => [key, childProcess[key]] as const);
  const counter: Counter = { count: 0 };

  for (const [key, original] of originals) {
    childProcess[key] = countingSpawn(original, counter);
  }

  syncBuiltinESMExports();

  const stop = (): void => {
    for (const [key, original] of originals) {
      childProcess[key] = original;
    }

    syncBuiltinESMExports();
  };

  return { read: () => counter.count, stop };
};

const loadAgentTools = async (): Promise<LoadedAgent> => {
  const runtimeModule = await importSource<RuntimeModule>(
    "src/server/main/runtime.ts"
  );

  const mcpRegistry = await importSource<McpRegistryModule>(
    "src/server/mcp/registry.ts"
  );

  const agentRegistry = await importSource<AgentRegistryModule>(
    "src/server/agent-tools/registry.ts"
  );

  const sdk = await import("@anthropic-ai/claude-agent-sdk");
  const runtime = runtimeModule.buildRuntime();

  const tools = agentRegistry.buildAgentTools(
    mcpRegistry.actionCaller(runtime),
    sdk.tool
  );

  const dispose = (): Promise<void> => runtimeModule.disposeRuntime(runtime);

  return { dispose, tools };
};

const runAgentTool = async (
  tools: readonly AgentTool[],
  name: string,
  counter: SpawnCounter,
  input: Fields
): Promise<SurfaceResult> => {
  const found = tools.find((entry) => entry.name === name);

  if (!found) {
    return { reason: `agent registry has no tool ${name}`, surface: "agent" };
  }

  const timing = await timed(() => found.handler(input, {}));

  return {
    isError: timing.value.isError === true,
    ms: timing.ms,
    output: parseText(firstText(timing.value)),
    spawns: counter.read(),
    surface: "agent",
  };
};

const callAgent = async (context: Context): Promise<SurfaceResult> => {
  const { name, off } = context.action.agent;

  if (!name) {
    return { reason: `agent binding is off (${off})`, surface: "agent" };
  }

  const counter = countGitSpawns();
  const { dispose, tools } = await loadAgentTools();

  try {
    return await runAgentTool(tools, name, counter, context.input);
  } finally {
    counter.stop();
    await dispose();
  }
};

export { callAgent, importSource };
