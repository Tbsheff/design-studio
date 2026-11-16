const CONNECT_CLIENT_IDS = [
  "claude-code",
  "cursor",
  "codex",
  "claude-desktop",
  "other",
] as const;

type ConnectClientId = (typeof CONNECT_CLIENT_IDS)[number];

interface ConnectClient {
  readonly id: ConnectClientId;
  readonly step: string;
  readonly title: string;
}

interface ConnectTarget {
  readonly name: string;
  readonly token: string;
  readonly url: string;
}

const JSON_INDENT = 2;

const TOKEN_MASK = "••••••••••••";

const CONNECT_CLIENTS: readonly ConnectClient[] = [
  {
    id: "claude-code",
    step: "Run this command in a terminal. Then type /mcp in Claude Code to see the server.",
    title: "Claude Code",
  },
  {
    id: "cursor",
    step: "Put this in ~/.cursor/mcp.json, or in .cursor/mcp.json in a project. Cursor loads it on the next start.",
    title: "Cursor",
  },
  {
    id: "codex",
    step: "Put this in ~/.codex/config.toml. Then start a new Codex session.",
    title: "Codex",
  },
  {
    id: "claude-desktop",
    step: "In Claude, open Settings > Developer > Edit Config. Put this in claude_desktop_config.json and restart Claude. It needs Node.js for mcp-remote.",
    title: "Claude Desktop",
  },
  {
    id: "other",
    step: "Give your client this Streamable HTTP url and the Authorization header.",
    title: "Other",
  },
];

const toBearer = (target: ConnectTarget): string => `Bearer ${target.token}`;

const toJson = <Config extends object>(config: Config): string =>
  JSON.stringify(config, null, JSON_INDENT);

const toClaudeCodeSnippet = (target: ConnectTarget): string =>
  `claude mcp add --scope user --transport http ${target.name} ${target.url} --header "Authorization: ${toBearer(target)}"`;

const toCursorSnippet = (target: ConnectTarget): string =>
  toJson({
    mcpServers: {
      [target.name]: {
        headers: { Authorization: toBearer(target) },
        url: target.url,
      },
    },
  });

const toCodexSnippet = (target: ConnectTarget): string =>
  [
    `[mcp_servers.${target.name}]`,
    `url = "${target.url}"`,
    `http_headers = { Authorization = "${toBearer(target)}" }`,
  ].join("\n");

const toClaudeDesktopSnippet = (target: ConnectTarget): string =>
  toJson({
    mcpServers: {
      [target.name]: {
        args: [
          "-y",
          "mcp-remote",
          target.url,
          "--header",
          `Authorization: ${toBearer(target)}`,
        ],
        command: "npx",
      },
    },
  });

const toOtherSnippet = (target: ConnectTarget): string =>
  toJson({
    mcpServers: {
      [target.name]: {
        headers: { Authorization: toBearer(target) },
        type: "http",
        url: target.url,
      },
    },
  });

const SNIPPETS: Record<ConnectClientId, (target: ConnectTarget) => string> = {
  "claude-code": toClaudeCodeSnippet,
  "claude-desktop": toClaudeDesktopSnippet,
  codex: toCodexSnippet,
  cursor: toCursorSnippet,
  other: toOtherSnippet,
};

const toClientSnippet = (id: ConnectClientId, target: ConnectTarget): string =>
  SNIPPETS[id](target);

const toMaskedSnippet = (id: ConnectClientId, target: ConnectTarget): string =>
  SNIPPETS[id]({ ...target, token: TOKEN_MASK });

const toConnectClient = (id: ConnectClientId): ConnectClient =>
  CONNECT_CLIENTS.find((client) => client.id === id) ??
  (CONNECT_CLIENTS[0] as ConnectClient);

export { CONNECT_CLIENTS, toClientSnippet, toConnectClient, toMaskedSnippet };

export type { ConnectClient, ConnectClientId, ConnectTarget };
