import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

import { toMasked } from "./integration-model.js";
import type { ServerConfig } from "./integration-server.js";

interface ProbeTool {
  readonly description: string;
  readonly name: string;
}

interface ProbeResult {
  readonly message: string | null;
  readonly status: "connected" | "error";
  readonly tools: readonly ProbeTool[];
}

interface ToolRecord {
  readonly description?: string;
  readonly name: string;
}

interface Closable {
  readonly close: () => Promise<void>;
}

const PROBE_TIMEOUT_MS = 15_000;

const MESSAGE_MAX = 300;

const DESCRIPTION_MAX = 400;

const TOOLS_MAX = 200;

const toProbeTool = (tool: ToolRecord): ProbeTool => ({
  description: (tool.description ?? "").slice(0, DESCRIPTION_MAX),
  name: tool.name,
});

const toErrorText = (text: string, secret: string | null): string =>
  toMasked(text, secret).replaceAll(/\s+/gu, " ").slice(0, MESSAGE_MAX);

const toTransport = async (config: ServerConfig): Promise<Transport> => {
  if (config.type === "http") {
    const { StreamableHTTPClientTransport } =
      await import("@modelcontextprotocol/sdk/client/streamableHttp.js");

    return new StreamableHTTPClientTransport(new URL(config.url), {
      requestInit: { headers: { ...config.headers } },
    });
  }

  const { StdioClientTransport, getDefaultEnvironment } =
    await import("@modelcontextprotocol/sdk/client/stdio.js");

  return new StdioClientTransport({
    args: config.args,
    command: config.command,
    env: { ...getDefaultEnvironment(), ...config.env },
    stderr: "ignore",
  });
};

const runClose = async (target: Closable): Promise<void> => {
  await Promise.allSettled([target.close()]);
};

const runConnect = async (config: ServerConfig): Promise<ProbeTool[]> => {
  const [{ Client }, transport] = await Promise.all([
    import("@modelcontextprotocol/sdk/client/index.js"),
    toTransport(config),
  ]);

  const client = new Client({ name: "design-studio", version: "1.0.0" });

  try {
    await client.connect(transport, { timeout: PROBE_TIMEOUT_MS });

    const listed = await client.listTools({}, { timeout: PROBE_TIMEOUT_MS });

    return listed.tools.slice(0, TOOLS_MAX).map((tool) => toProbeTool(tool));
  } finally {
    await runClose(client);
    await runClose(transport);
  }
};

const runProbe = async (
  config: ServerConfig,
  secret: string | null
): Promise<ProbeResult> => {
  try {
    const tools = await runConnect(config);

    return { message: null, status: "connected", tools };
  } catch (error) {
    let text = "The server did not connect.";

    if (error instanceof Error && error.message !== "") {
      text = error.message;
    }

    return {
      message: toErrorText(text, secret),
      status: "error",
      tools: [],
    };
  }
};

export { runProbe };

export type { ProbeResult, ProbeTool };
