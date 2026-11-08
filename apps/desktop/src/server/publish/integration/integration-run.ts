import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Conflict } from "@design-studio/actions/_core/errors/conflict";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Effect } from "effect";

import { attemptKnown, setPrivateJson } from "./deps.js";
import {
  inspectAllowed,
  inspectConnection,
  inspectName,
  inspectSecret,
} from "./integration-check.js";
import type { StoredIntegration } from "./integration-model.js";
import { toIntegrationFile } from "./integration-paths.js";
import { runProbe } from "./integration-probe.js";
import { getSavedIntegrationById } from "./integration-saved.js";
import {
  deleteIntegrationFile,
  deleteSecret,
  getSecret,
  setSecret,
} from "./integration-secret.js";
import { toServerConfig, toServerSecret } from "./integration-server.js";

interface CreateIntegrationCommand {
  readonly args: readonly string[];
  readonly command: string | null;
  readonly name: string;
  readonly secret: string | null;
  readonly secretName: string | null;
  readonly transport: "http" | "stdio";
  readonly url: string | null;
}

interface UpdateIntegrationCommand {
  readonly allowedTools: readonly string[] | null;
  readonly args: readonly string[] | null;
  readonly command: string | null;
  readonly id: string;
  readonly isEnabled: boolean | null;
  readonly secret: string | null;
  readonly secretName: string | null;
  readonly url: string | null;
}

const toKept = (text: string | null): string | null => {
  if (text === null || text.trim() === "") {
    return null;
  }

  return text.trim();
};

const getSaved = Effect.fn("IntegrationRun.getSaved")(function* run(
  id: string
) {
  const found = yield* getSavedIntegrationById(id);

  if (found === null) {
    return yield* new NotFound({
      message: `No integration is named ${id}. Open settings to see the saved integrations.`,
    });
  }

  return found;
});

const createSavedIntegration = Effect.fn("IntegrationRun.create")(function* run(
  command: CreateIntegrationCommand
) {
  yield* inspectName(command.name);
  yield* inspectSecret(command.secret);

  const fields = {
    command: toKept(command.command),
    transport: command.transport,
    url: toKept(command.url),
  };

  yield* inspectConnection(fields);

  if ((yield* getSavedIntegrationById(command.name)) !== null) {
    return yield* new Conflict({
      message: `An integration named ${command.name} exists already. Pick another name, or change that one.`,
    });
  }

  const secret = toKept(command.secret);

  if (secret !== null) {
    yield* attemptKnown(() => setSecret(command.name, secret));
  }

  const saved: StoredIntegration = {
    allowedTools: [],
    args: [...command.args],
    checkedAt: null,
    command: fields.command,
    createdAt: new Date().toISOString(),
    hasSecret: secret !== null,
    id: command.name,
    isEnabled: true,
    name: command.name,
    secretName: toKept(command.secretName),
    status: "untested",
    statusMessage: null,
    tools: [],
    transport: command.transport,
    url: fields.url,
  };

  yield* setPrivateJson(toIntegrationFile(saved.id), saved);

  return saved;
});

interface SecretChange {
  readonly hasSecret: boolean;
  readonly value: string | null;
}

const toSecretChange = (
  saved: StoredIntegration,
  command: UpdateIntegrationCommand
): SecretChange => {
  if (command.secret === null) {
    return { hasSecret: saved.hasSecret, value: null };
  }

  const value = toKept(command.secret);

  return { hasSecret: value !== null, value };
};

const isConnectionChange = (
  saved: StoredIntegration,
  next: StoredIntegration,
  isSecretChange: boolean
): boolean => {
  const isFieldChange =
    saved.command !== next.command ||
    saved.url !== next.url ||
    saved.secretName !== next.secretName;

  return (
    isSecretChange ||
    isFieldChange ||
    saved.args.join("\n") !== next.args.join("\n")
  );
};

const updateSavedIntegration = Effect.fn("IntegrationRun.update")(function* run(
  command: UpdateIntegrationCommand
) {
  const saved = yield* getSaved(command.id);
  yield* inspectSecret(command.secret);
  const change = toSecretChange(saved, command);

  const next: StoredIntegration = {
    ...saved,
    allowedTools: command.allowedTools ?? saved.allowedTools,
    args: command.args ?? saved.args,
    command: toKept(command.command) ?? saved.command,
    hasSecret: change.hasSecret,
    isEnabled: command.isEnabled ?? saved.isEnabled,
    secretName: toKept(command.secretName) ?? saved.secretName,
    url: toKept(command.url) ?? saved.url,
  };

  yield* inspectConnection(next);
  yield* inspectAllowed(
    next.allowedTools,
    saved.tools.map((tool) => tool.name)
  );

  if (command.secret !== null && change.value !== null) {
    const { value } = change;
    yield* attemptKnown(() => setSecret(saved.id, value));
  }

  if (command.secret !== null && change.value === null) {
    yield* attemptKnown(() => deleteSecret(saved.id));
  }

  let result = next;

  if (isConnectionChange(saved, next, command.secret !== null)) {
    result = {
      ...next,
      checkedAt: null,
      status: "untested",
      statusMessage: null,
    };
  }

  yield* setPrivateJson(toIntegrationFile(result.id), result);

  return result;
});

const runSavedIntegration = Effect.fn("IntegrationRun.run")(function* run(
  id: string
) {
  const saved = yield* getSaved(id);
  const value = yield* attemptKnown(() => getSecret(saved.id));
  const config = toServerConfig(saved, toServerSecret(saved, value));

  if (config === null) {
    return yield* new BadRequest({
      message: "The integration has no command or url. Change it first.",
    });
  }

  const probe = yield* Effect.promise(() => runProbe(config, value));
  const isConnected = probe.status === "connected";
  const known = new Set(probe.tools.map((tool) => tool.name));
  let kept: StoredIntegration["tools"] = saved.tools;
  let allowed = saved.allowedTools;

  if (isConnected) {
    kept = probe.tools;
    allowed = saved.allowedTools.filter((name) => known.has(name));
  }

  const next: StoredIntegration = {
    ...saved,
    allowedTools: allowed,
    checkedAt: new Date().toISOString(),
    status: probe.status,
    statusMessage: probe.message,
    tools: kept,
  };

  yield* setPrivateJson(toIntegrationFile(next.id), next);

  return next;
});

const deleteSavedIntegration = Effect.fn("IntegrationRun.delete")(function* run(
  id: string
) {
  const saved = yield* getSaved(id);

  yield* attemptKnown(() => deleteSecret(saved.id));
  yield* attemptKnown(() => deleteIntegrationFile(saved.id));

  return { id: saved.id, name: saved.name };
});

export {
  createSavedIntegration,
  deleteSavedIntegration,
  getSaved,
  runSavedIntegration,
  updateSavedIntegration,
};

export type { CreateIntegrationCommand, UpdateIntegrationCommand };
