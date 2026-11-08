import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Effect } from "effect";

import { RESERVED_NAMES } from "./integration-model.js";
import { SECRET_MAX } from "./integration-secret.js";

interface ConnectionFields {
  readonly command: string | null;
  readonly transport: "http" | "stdio";
  readonly url: string | null;
}

const HTTP_PATTERN = /^https?:\/\/\S+$/u;

const isBlank = (text: string | null): boolean =>
  text === null || text.trim() === "";

const inspectName = Effect.fn("IntegrationCheck.name")(function* run(
  name: string
) {
  if (RESERVED_NAMES.has(name) || name.includes("__")) {
    return yield* new BadRequest({
      message: `The name ${name} is not allowed. Use letters, digits and single underscores, and not studio.`,
    });
  }
});

const inspectConnection = Effect.fn("IntegrationCheck.connection")(
  function* run(fields: ConnectionFields) {
    if (fields.transport === "stdio" && isBlank(fields.command)) {
      return yield* new BadRequest({
        message: "A stdio server needs a command.",
      });
    }

    if (
      fields.transport === "http" &&
      (fields.url === null || !HTTP_PATTERN.test(fields.url))
    ) {
      return yield* new BadRequest({
        message:
          "An http server needs a url that starts with http:// or https://.",
      });
    }
  }
);

const inspectSecret = Effect.fn("IntegrationCheck.secret")(function* run(
  secret: string | null
) {
  if (secret !== null && secret.length > SECRET_MAX) {
    return yield* new BadRequest({
      message: `The secret is longer than ${SECRET_MAX} characters.`,
    });
  }
});

const inspectAllowed = Effect.fn("IntegrationCheck.allowed")(function* run(
  allowed: readonly string[],
  known: readonly string[]
) {
  const names = new Set(known);
  const unknown = allowed.filter((name) => !names.has(name));

  if (unknown.length > 0) {
    return yield* new BadRequest({
      message: `These tools are not in the saved tool list: ${unknown.join(", ")}. Run the server first.`,
    });
  }
});

export { inspectAllowed, inspectConnection, inspectName, inspectSecret };
