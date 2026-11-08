import { Effect } from "effect";

import { CurrentOrg } from "../../tenant/current-org.js";
import type { AgentGrant } from "./agent-auth.js";
import { CurrentKey } from "./current-key.js";
import { CurrentUser } from "./current-user.js";
import type { MemberGrant } from "./member-auth.js";

const provideMemberGrant =
  (grant: MemberGrant) =>
  <Value, Failure, Needs>(
    handler: Effect.Effect<Value, Failure, Needs>
  ): Effect.Effect<
    Value,
    Failure,
    Exclude<Exclude<Needs, CurrentOrg>, CurrentUser>
  > =>
    handler.pipe(
      Effect.provideService(CurrentOrg, grant.org),
      Effect.provideService(CurrentUser, grant.user)
    );

const provideAgentGrant =
  (grant: AgentGrant) =>
  <Value, Failure, Needs>(
    handler: Effect.Effect<Value, Failure, Needs>
  ): Effect.Effect<
    Value,
    Failure,
    Exclude<Exclude<Needs, CurrentOrg>, CurrentKey>
  > =>
    handler.pipe(
      Effect.provideService(CurrentOrg, grant.org),
      Effect.provideService(CurrentKey, grant.key)
    );

export { provideAgentGrant, provideMemberGrant };
