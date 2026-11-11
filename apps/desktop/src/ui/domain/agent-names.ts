const KNOWN_CLIENTS: readonly (readonly [RegExp, string])[] = [
  [/^claude[-_ ]?code/iu, "Claude Code"],
  [/^claude[-_ ]?(?:ai|desktop)/iu, "Claude Desktop"],
  [/^mcp[-_ ]?remote/iu, "Claude Desktop"],
  [/cursor/iu, "Cursor"],
  [/codex/iu, "Codex"],
];

const toAgentName = (client: string): string => {
  const found = KNOWN_CLIENTS.find(([pattern]) => pattern.test(client));

  if (found) {
    return found[1];
  }

  return client;
};

const toAgentNames = (clients: readonly string[]): string[] => [
  ...new Set(clients.map((client) => toAgentName(client))),
];

export { toAgentName, toAgentNames };
