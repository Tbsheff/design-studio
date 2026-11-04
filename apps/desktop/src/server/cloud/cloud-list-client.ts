import { Context, Effect, Layer } from "effect";

import type { Unauthenticated } from "../../shared/actions/_core/errors/unauthenticated.js";
import type { Unavailable } from "../../shared/actions/_core/errors/unavailable.js";
import type { Publication } from "../../shared/publish.js";
import { getJsonResponse } from "./cloud-fetch.js";
import {
  CloudPublicationListSchema,
  toProjectPath,
  toPublication,
} from "./cloud-link-rows.js";
import { CloudSession } from "./cloud-session.js";

interface CloudListClientApi {
  readonly listPublications: (
    orgId: string,
    projectId: string
  ) => Effect.Effect<readonly Publication[], Unauthenticated | Unavailable>;
}

class CloudListClient extends Context.Service<
  CloudListClient,
  CloudListClientApi
>()("design-studio/cloud/CloudListClient") {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    CloudListClient,
    Effect.gen(function* make() {
      const session = yield* CloudSession;

      return CloudListClient.of({
        listPublications: Effect.fn("CloudListClient.listPublications")(
          function* run(orgId: string, projectId: string) {
            const list = yield* session.withToken((token) =>
              getJsonResponse(
                {
                  body: null,
                  headers: {},
                  jwt: token,
                  method: "GET",
                  path: `${toProjectPath(orgId, projectId)}/publications`,
                },
                CloudPublicationListSchema
              )
            );

            return list.publications.map((row) => toPublication(row));
          }
        ),
      });
    })
  );
}

export { CloudListClient };

export type { CloudListClientApi };
