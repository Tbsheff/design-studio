import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { fail, runCli } from "./stamp/args.js";
import type { Json } from "./stamp/call-types.js";
import { toWorkspaceBin } from "./workspace-root.js";

interface SnapshotTool {
  readonly annotations: Json;
  readonly description: string;
  readonly inputSchema: Json;
  readonly name: string;
}

interface SnapshotFile {
  readonly tools: readonly SnapshotTool[];
}

interface LiveServer {
  readonly child: ChildProcess;
  readonly dataDir: string;
  readonly mcpPort: number;
  readonly token: string;
}

interface RpcReply {
  readonly error?: { readonly message: string };
  readonly result?: { readonly tools?: readonly SnapshotTool[] };
}

const APP_ROOT = fileURLToPath(new URL("..", import.meta.url));

const SNAPSHOT_DIR = path.join(APP_ROOT, "artifacts/mcp-snapshots");

const BOOT_ATTEMPTS = 240;

const BOOT_DELAY_MS = 500;

const TOKEN_BYTES = 32;

const PROTOCOL = "2025-06-18";

const USAGE =
  "pnpm exec tsx scripts/mcp-snapshot.ts <group...> [--check] | --all [--check] | --list";

const toNames = (text: string): readonly string[] => text.split(" ");

const EXISTING_GROUPS = toNames(
  "comments export mcp-read packs publish share ship"
);

const NEW_GROUPS = new Map<string, readonly string[]>([
  [
    "canvas",
    toNames(
      "canvas_list canvas_place canvas_point add_frame remove_frame add_route_frame list_links add_link remove_link set_start_frame keep_links keep_variant list_page_variations keep_page_variation discard_page_variation list_frame_states set_frame_state set_frame_session list_route_links add_flow list_link_interactions set_link_interaction"
    ),
  ],
  [
    "design-system",
    toNames(
      "set_token apply_design_system get_design_rules set_design_rules test_design_rules"
    ),
  ],
  [
    "direct-edit-component",
    toNames(
      "set_props review_frame apply_fix insert_component list_components component_preview create_component swap_instance"
    ),
  ],
  [
    "direct-edit-element",
    toNames(
      "write_file edit_element batch_edit undo redo edit_history revert_hunk find_styles replace_style arrange select_matching measure insert_jsx clear_text get_layers set_image draw_vector boolean_shapes paint_shape set_layer_state list_locked_layers move_element import_figma_frame list_tweaks set_tweak list_motion list_state_styles set_forced_state search_text list_text_styles detach_text_style list_icons search_images place_image"
    ),
  ],
  ["project-workspace", toNames("create_project attach_app apply_app_fix")],
  ["run-agent", []],
  ["versions", toNames("restore_version diff_versions")],
]);

const toFreePort = async (): Promise<number> => {
  const probe = net.createServer();

  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");

  const address = probe.address();

  probe.close();
  await once(probe, "close");

  if (!(address instanceof Object)) {
    return fail("could not read a free port", USAGE);
  }

  return address.port;
};

const toRpcReply = async (
  server: LiveServer,
  method: string,
  params: Json
): Promise<RpcReply> => {
  const response = await fetch(`http://127.0.0.1:${server.mcpPort}/mcp`, {
    body: JSON.stringify({ id: 1, jsonrpc: "2.0", method, params }),
    headers: {
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${server.token}`,
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    return fail(
      `MCP answered ${response.status}`,
      "check that the studio server booted with the temp mcp.json"
    );
  }

  const reply = (await response.json()) as RpcReply;

  if (reply.error) {
    return fail(`MCP error: ${reply.error.message}`, USAGE);
  }

  return reply;
};

const runBootWait = async (
  server: LiveServer,
  attemptsLeft: number
): Promise<void> => {
  if (attemptsLeft === 0) {
    server.child.kill("SIGTERM");

    return fail(
      "the studio server did not answer MCP in time",
      "run STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev and read its log"
    );
  }

  try {
    await toRpcReply(server, "initialize", {
      capabilities: {},
      clientInfo: { name: "mcp-snapshot", version: "0.0.0" },
      protocolVersion: PROTOCOL,
    });
  } catch {
    await sleep(BOOT_DELAY_MS);
    await runBootWait(server, attemptsLeft - 1);
  }
};

const startServer = async (): Promise<LiveServer> => {
  const tempRoot = path.join(os.tmpdir(), "mcp-snapshot-");

  const [dataDir, mcpPort] = await Promise.all([
    mkdtemp(tempRoot),
    toFreePort(),
  ]);

  const token = randomBytes(TOKEN_BYTES).toString("base64url");

  await writeFile(
    path.join(dataDir, "mcp.json"),
    JSON.stringify({ edits: true, enabled: true, port: mcpPort, token })
  );

  const ports = await Promise.all([toFreePort(), toFreePort(), toFreePort()]);

  const child = spawn(
    "/usr/bin/env",
    [
      "STUDIO_AGENT=mock",
      `STUDIO_DATA_DIR=${dataDir}`,
      `STUDIO_PORT=${ports[0]}`,
      `STUDIO_PREVIEW_PORT=${ports[1]}`,
      `STUDIO_SHARE_PORT=${ports[2]}`,
      toWorkspaceBin("tsx"),
      "src/server/index.ts",
    ],
    { cwd: APP_ROOT, stdio: "ignore" }
  );

  const server: LiveServer = { child, dataDir, mcpPort, token };

  await runBootWait(server, BOOT_ATTEMPTS);

  return server;
};

const stopServer = async (server: LiveServer): Promise<void> => {
  server.child.kill("SIGTERM");

  await sleep(BOOT_DELAY_MS);
  await rm(server.dataDir, { force: true, recursive: true });
};

const listTools = async (
  server: LiveServer
): Promise<readonly SnapshotTool[]> => {
  const reply = await toRpcReply(server, "tools/list", {});

  return (reply.result?.tools ?? []).map((tool) => ({
    annotations: tool.annotations ?? null,
    description: tool.description,
    inputSchema: tool.inputSchema,
    name: tool.name,
  }));
};

const toSnapshotPath = (group: string): string =>
  path.join(SNAPSHOT_DIR, `${group}.json`);

const getSnapshot = async (group: string): Promise<SnapshotFile | null> => {
  try {
    return JSON.parse(
      await readFile(toSnapshotPath(group), "utf-8")
    ) as SnapshotFile;
  } catch {
    return null;
  }
};

const toGroupNames = async (group: string): Promise<readonly string[]> => {
  if (EXISTING_GROUPS.includes(group)) {
    const file = await getSnapshot(group);

    return (file?.tools ?? []).map((tool) => tool.name);
  }

  return NEW_GROUPS.get(group) ?? fail(`unknown group ${group}`, USAGE);
};

const toAllGroups = (): readonly string[] => [
  ...EXISTING_GROUPS,
  ...NEW_GROUPS.keys(),
];

const toGroupTools = async (
  group: string,
  live: readonly SnapshotTool[]
): Promise<readonly SnapshotTool[]> => {
  const names = new Set(await toGroupNames(group));

  return live.filter((tool) => names.has(tool.name));
};

const isSameTool = (left: SnapshotTool, right: SnapshotTool): boolean =>
  isDeepStrictEqual(left.inputSchema, right.inputSchema) &&
  isDeepStrictEqual(left.annotations ?? null, right.annotations ?? null);

const toChange = (
  tool: SnapshotTool,
  liveByName: ReadonlyMap<string, SnapshotTool>
): readonly string[] => {
  const current = liveByName.get(tool.name) ?? null;

  if (current === null) {
    return [`removed: ${tool.name}`];
  }

  if (isSameTool(current, tool)) {
    return [];
  }

  return [`changed: ${tool.name}`];
};

const toDiff = (
  saved: readonly SnapshotTool[],
  live: readonly SnapshotTool[]
): readonly string[] => {
  const liveByName = new Map(live.map((tool) => [tool.name, tool]));
  const savedNames = new Set(saved.map((tool) => tool.name));

  const changes = saved.flatMap((tool) => toChange(tool, liveByName));

  const added = live.flatMap((tool) => {
    if (savedNames.has(tool.name)) {
      return [];
    }

    return [`added: ${tool.name}`];
  });

  return [...changes, ...added];
};

const runCheck = async (
  group: string,
  live: readonly SnapshotTool[]
): Promise<boolean> => {
  const file = await getSnapshot(group);

  if (file === null) {
    console.error(`missing: ${toSnapshotPath(group)}`);

    return false;
  }

  const diff = toDiff(file.tools, await toGroupTools(group, live));

  console.error(diff.map((line) => `${group} ${line}`).join("\n"));
  console.log(`${group}: ${diff.length} differences`);

  return diff.length === 0;
};

const runWrite = async (
  group: string,
  live: readonly SnapshotTool[]
): Promise<boolean> => {
  if (EXISTING_GROUPS.includes(group)) {
    return fail(
      `${group}.json exists and is never rewritten`,
      "use --check to compare it"
    );
  }

  const tools = await toGroupTools(group, live);
  const names = await toGroupNames(group);

  await writeFile(
    toSnapshotPath(group),
    `${JSON.stringify({ tools }, null, 2)}\n`
  );

  console.log(`${group}: wrote ${tools.length} of ${names.length} tools`);

  return tools.length === names.length;
};

const toTargetGroups = (
  isAll: boolean,
  named: readonly string[]
): readonly string[] => {
  if (isAll) {
    return toAllGroups();
  }

  return named;
};

const runGroup = (
  group: string,
  isCheck: boolean,
  live: readonly SnapshotTool[]
): Promise<boolean> => {
  if (isCheck) {
    return runCheck(group, live);
  }

  return runWrite(group, live);
};

const runList = (live: readonly SnapshotTool[]): void => {
  console.log(`live tools: ${live.length}`);
  console.log(live.map((tool) => tool.name).join(" "));
};

const runSnapshot = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const isCheck = args.includes("--check");
  const isAll = args.includes("--all");
  const named = args.filter((arg) => !arg.startsWith("--"));

  if (!isAll && !args.includes("--list") && named.length === 0) {
    fail("name a group", USAGE);
  }

  const server = await startServer();

  try {
    const live = await listTools(server);

    if (args.includes("--list")) {
      runList(live);

      return;
    }

    const groups = toTargetGroups(isAll, named);

    const results = await Promise.all(
      groups.map((name) => runGroup(name, isCheck, live))
    );

    if (results.includes(false)) {
      process.exitCode = 1;
    }
  } finally {
    await stopServer(server);
  }
};

await runCli(runSnapshot);
