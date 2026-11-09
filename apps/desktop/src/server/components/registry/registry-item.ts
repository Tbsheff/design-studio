import { Effect, Result, Schema } from "effect";

import { BadRequestError, toDecoder } from "./deps.js";
import type { RegistryItem } from "./engine/index.js";
import { RegistryUnavailableError } from "./errors.js";
import { getFixtureItem } from "./registry-fixtures.js";

interface RegistryRequest {
  readonly isOffline: boolean;
  readonly name: string;
  readonly style: string;
  readonly url: string | null;
}

const REGISTRY_ORIGIN = "https://ui.shadcn.com";

const TIMEOUT_MS = 10_000;

const NOT_FOUND = 404;

const NamesSchema = Schema.Array(Schema.String).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed([] as readonly string[]))
);

const RegistryItemSchema = Schema.Struct({
  dependencies: NamesSchema,
  devDependencies: NamesSchema,
  files: Schema.Array(
    Schema.Struct({
      content: Schema.String,
      path: Schema.String,
      type: Schema.String,
    })
  ),
  name: Schema.String,
  registryDependencies: NamesSchema,
});

const decodeRegistryItem = toDecoder(RegistryItemSchema, "ignore");

const toRegistryUrl = (name: string, style: string): string =>
  `${REGISTRY_ORIGIN}/r/styles/${encodeURIComponent(style)}/${encodeURIComponent(name)}.json`;

const getRegistryResponse = async (
  url: string,
  name: string
): Promise<Response> => {
  let response: Response | null = null;

  try {
    response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new RegistryUnavailableError(
      `The registry did not answer for ${name}. Check the network and try again.`
    );
  }

  if (response.status === NOT_FOUND) {
    throw new BadRequestError(`The registry has no item named ${name}.`);
  }

  if (!response.ok) {
    throw new RegistryUnavailableError(
      `The registry answered ${response.status} for ${name}.`
    );
  }

  return response;
};

const getRemoteItem = async (
  url: string,
  name: string
): Promise<RegistryItem> => {
  const response = await getRegistryResponse(url, name);
  const result = decodeRegistryItem(await response.json());

  if (Result.isFailure(result)) {
    throw new BadRequestError(
      `The registry item ${name} has a shape that the studio cannot read.`
    );
  }

  return result.success;
};

const getRegistryItem = async (
  request: RegistryRequest
): Promise<RegistryItem> => {
  const fixture = getFixtureItem(request.name);

  if (request.isOffline) {
    if (fixture === null) {
      throw new RegistryUnavailableError(
        `The studio is offline and has no bundled item named ${request.name}.`
      );
    }

    return fixture;
  }

  const url = request.url ?? toRegistryUrl(request.name, request.style);

  try {
    return await getRemoteItem(url, request.name);
  } catch (error) {
    if (
      error instanceof RegistryUnavailableError &&
      fixture !== null &&
      request.url === null
    ) {
      return fixture;
    }

    throw error;
  }
};

export { getRegistryItem, toRegistryUrl };

export type { RegistryRequest };
