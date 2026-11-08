import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Unavailable } from "@design-studio/actions/_core/errors/unavailable";
import { Context, Effect, Layer } from "effect";

import { inspectUrl } from "./url/pattern-url-candidates.js";
import type { UrlCandidate } from "./url/pattern-url-candidates.js";

interface InspectUrlCommand {
  readonly cursor: string | null;
  readonly limit: number;
  readonly url: string;
  readonly width: number;
}

interface UrlCandidatePage {
  readonly items: readonly UrlCandidate[];
  readonly next: string | null;
}

interface PatternUrlStoreApi {
  readonly inspect: (
    command: InspectUrlCommand
  ) => Effect.Effect<UrlCandidatePage, BadRequest | Unavailable>;
}

const toStart = (cursor: string | null): number => {
  const start = Number(cursor ?? "0");

  if (Number.isInteger(start) && start >= 0) {
    return start;
  }

  return 0;
};

const toPage = (
  all: readonly UrlCandidate[],
  command: InspectUrlCommand
): UrlCandidatePage => {
  const start = toStart(command.cursor);
  const items = all.slice(start, start + command.limit);
  const end = start + items.length;
  let next: string | null = null;

  if (end < all.length) {
    next = String(end);
  }

  return { items, next };
};

class PatternUrlStore extends Context.Service<
  PatternUrlStore,
  PatternUrlStoreApi
>()("design-studio/share/PatternUrlStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    PatternUrlStore,
    PatternUrlStore.of({
      inspect: Effect.fn("PatternUrlStore.inspect")(function* run(
        command: InspectUrlCommand
      ) {
        const result = yield* Effect.promise(() =>
          inspectUrl({ url: command.url, width: command.width })
        );

        if (result.ok) {
          return toPage(result.candidates, command);
        }

        if (result.code === "bad_url") {
          return yield* new BadRequest({ message: result.message });
        }

        return yield* new Unavailable({ message: result.message });
      }),
    })
  );
}

export { PatternUrlStore };

export type { InspectUrlCommand, PatternUrlStoreApi, UrlCandidatePage };
