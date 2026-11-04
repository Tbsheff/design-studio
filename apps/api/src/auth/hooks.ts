import { APIError, createAuthMiddleware } from "better-auth/api";
import { Schema } from "effect";

import { hasOwner } from "./member-roles.js";
import type { MemberRoles } from "./member-roles.js";
import { AUTH_RULES } from "./rate-limit.js";
import type { RateClient, RateRule } from "./rate-limit.js";

interface MemberTarget {
  readonly role: string;
  readonly userId: string;
}

interface Actor {
  readonly id: string;
}

interface OrgRef {
  readonly id: string;
}

interface OrgHooks {
  readonly afterRemoveMember: (input: RemoveInput) => Promise<void>;
  readonly beforeCreateInvitation: (input: InviteInput) => Promise<void>;
  readonly beforeRemoveMember: (input: RemoveInput) => Promise<void>;
  readonly beforeUpdateMemberRole: (input: RoleInput) => Promise<void>;
}

interface RemoveInput {
  readonly member: MemberTarget;
  readonly organization: OrgRef;
  readonly user: Actor;
}

interface InviteInput {
  readonly invitation: { readonly role: string };
  readonly inviter: Actor;
  readonly organization: OrgRef;
}

interface RoleInput {
  readonly member: MemberTarget;
  readonly newRole: string;
  readonly organization: OrgRef;
  readonly user: Actor;
}

type BeforeHook = ReturnType<typeof createAuthMiddleware>;

interface OrgRequest {
  readonly body: unknown;
  readonly query: unknown;
}

interface HookDeps {
  readonly members: MemberRoles;
  readonly rate: RateClient;
}

const PUBLIC_PATHS: ReadonlySet<string> = new Set([
  "/callback/:id",
  "/device",
  "/device/approve",
  "/device/code",
  "/device/deny",
  "/device/token",
  "/get-session",
  "/jwks",
  "/list-sessions",
  "/organization/accept-invitation",
  "/organization/create",
  "/organization/get-invitation",
  "/organization/list",
  "/organization/list-user-invitations",
  "/organization/reject-invitation",
  "/request-password-reset",
  "/reset-password",
  "/reset-password/:token",
  "/revoke-session",
  "/revoke-sessions",
  "/send-verification-email",
  "/sign-in/email",
  "/sign-in/social",
  "/sign-out",
  "/sign-up/email",
  "/token",
  "/verify-email",
]);

const BLOCKED_PATHS: ReadonlySet<string> = new Set([
  "/api-key/create",
  "/api-key/update",
  "/organization/set-active",
]);

const ORG_PREFIX = "/organization/";

const PASSKEY_PREFIX = "/passkey/";

const RATE_PATHS = new Map<string, RateRule>([
  ["/device/code", AUTH_RULES.device],
  ["/send-verification-email", AUTH_RULES.verify],
  ["/sign-in/email", AUTH_RULES.signIn],
  ["/sign-up/email", AUTH_RULES.signUp],
]);

const OrgFieldsSchema = Schema.Struct({
  organizationId: Schema.NonEmptyString,
});

const isOrgFields = Schema.is(OrgFieldsSchema);

const forbid = (message: string): APIError =>
  new APIError("FORBIDDEN", { message });

const hasOrgId = (request: OrgRequest): boolean =>
  isOrgFields(request.body) || isOrgFields(request.query);

const isAllowedPath = (path: string, request: OrgRequest): boolean => {
  if (BLOCKED_PATHS.has(path)) {
    return false;
  }

  if (PUBLIC_PATHS.has(path) || path.startsWith(PASSKEY_PREFIX)) {
    return true;
  }

  return path.startsWith(ORG_PREFIX) && hasOrgId(request);
};

const toClientKey = (request: Request, path: string): string =>
  `auth:${path}:${request.headers.get("cf-connecting-ip") ?? "unknown"}`;

const checkRate = async (
  rate: RateClient,
  request: Request,
  path: string
): Promise<void> => {
  const rule = RATE_PATHS.get(path) ?? null;

  if (rule === null) {
    return;
  }

  const verdict = await rate.hit(toClientKey(request, path), rule);

  if (!verdict.isAllowed) {
    throw new APIError("TOO_MANY_REQUESTS", {
      message: "Too many requests. Wait, then try again.",
    });
  }
};

const toBeforeHook = (deps: HookDeps): BeforeHook =>
  createAuthMiddleware(async (context) => {
    const request = context.request ?? null;

    if (request === null) {
      return;
    }

    if (!isAllowedPath(context.path, context)) {
      throw forbid("This auth endpoint is not available.");
    }

    await checkRate(deps.rate, request, context.path);
  });

const requireOwnerActor = async (
  members: MemberRoles,
  orgId: string,
  actor: Actor
): Promise<void> => {
  const role = await members.readRole(orgId, actor.id);

  if (!hasOwner(role)) {
    throw forbid("Only an owner can grant or change the owner role.");
  }
};

const requireNotLastOwner = async (
  members: MemberRoles,
  orgId: string,
  member: MemberTarget
): Promise<void> => {
  if (!hasOwner(member.role)) {
    return;
  }

  const total = await members.countOwners(orgId);

  if (total <= 1) {
    throw forbid("An org must keep at least one owner.");
  }
};

const toOrgHooks = (members: MemberRoles): OrgHooks => ({
  afterRemoveMember: async (input) => {
    await members.revokeMember(input.organization.id, input.member.userId);
  },
  beforeCreateInvitation: async (input) => {
    if (hasOwner(input.invitation.role)) {
      await requireOwnerActor(members, input.organization.id, input.inviter);
    }
  },
  beforeRemoveMember: async (input) => {
    if (hasOwner(input.member.role)) {
      await requireOwnerActor(members, input.organization.id, input.user);
    }

    await requireNotLastOwner(members, input.organization.id, input.member);
  },
  beforeUpdateMemberRole: async (input) => {
    if (hasOwner(input.newRole) || hasOwner(input.member.role)) {
      await requireOwnerActor(members, input.organization.id, input.user);
    }

    if (!hasOwner(input.newRole)) {
      await requireNotLastOwner(members, input.organization.id, input.member);
    }
  },
});

export { isAllowedPath, toBeforeHook, toOrgHooks };

export type { HookDeps, OrgHooks };
