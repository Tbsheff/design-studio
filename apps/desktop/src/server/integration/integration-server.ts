import type { StoredIntegration } from "./integration-model.js";

interface ServerSecret {
  readonly name: string;
  readonly value: string;
}

type StringMap = Readonly<Record<string, string>>;

interface StdioServer {
  readonly args: string[];
  readonly command: string;
  readonly env: StringMap;
  readonly type: "stdio";
}

interface HttpServer {
  readonly headers: StringMap;
  readonly type: "http";
  readonly url: string;
}

type ServerConfig = HttpServer | StdioServer;

const DEFAULT_ENV_NAME = "INTEGRATION_TOKEN";

const DEFAULT_HEADER_NAME = "Authorization";

const toEnvEntries = (secret: ServerSecret | null): [string, string][] => {
  if (secret === null) {
    return [];
  }

  return [[secret.name, secret.value]];
};

const toHeaderEntries = (secret: ServerSecret | null): [string, string][] => {
  if (secret === null) {
    return [];
  }

  if (secret.name.toLowerCase() === DEFAULT_HEADER_NAME.toLowerCase()) {
    return [[secret.name, `Bearer ${secret.value}`]];
  }

  return [[secret.name, secret.value]];
};

const toServerSecret = (
  saved: StoredIntegration,
  value: string | null
): ServerSecret | null => {
  if (value === null) {
    return null;
  }

  if (saved.transport === "http") {
    return { name: saved.secretName ?? DEFAULT_HEADER_NAME, value };
  }

  return { name: saved.secretName ?? DEFAULT_ENV_NAME, value };
};

const toServerConfig = (
  saved: StoredIntegration,
  secret: ServerSecret | null
): ServerConfig | null => {
  if (saved.transport === "http") {
    if (saved.url === null) {
      return null;
    }

    return {
      headers: Object.fromEntries(toHeaderEntries(secret)),
      type: "http",
      url: saved.url,
    };
  }

  if (saved.command === null) {
    return null;
  }

  return {
    args: [...saved.args],
    command: saved.command,
    env: Object.fromEntries(toEnvEntries(secret)),
    type: "stdio",
  };
};

export { toServerConfig, toServerSecret };

export type { HttpServer, ServerConfig, ServerSecret, StdioServer };
