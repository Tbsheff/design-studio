import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import type { BetterAuthOptions } from "better-auth";
import {
  admin,
  deviceAuthorization,
  jwt,
  organization,
} from "better-auth/plugins";

import { accessControl, roles } from "./access-control.js";
import { toBeforeHook, toOrgHooks } from "./hooks.js";
import type { MemberRoles } from "./member-roles.js";
import type { RateClient } from "./rate-limit.js";

interface VerifiedUser {
  readonly emailVerified: boolean;
  readonly id: string;
  readonly name: string;
}

interface AuthSettings {
  readonly authUrl: string;
  readonly rpId: string;
  readonly webOrigin: string;
}

interface AuthInput {
  readonly database: BetterAuthOptions["database"];
  readonly members: MemberRoles;
  readonly onVerified: (user: VerifiedUser) => Promise<void>;
  readonly rate: RateClient;
  readonly settings: AuthSettings;
}

const COOKIE_CACHE_SECONDS = 60;

const JWT_TTL = "15m";

const DEVICE_CODE_TTL = "5m";

const MCP_KEY_RATE = { enabled: true, maxRequests: 600, timeWindow: 60_000 };

const canCreateOrg = async (user: VerifiedUser): Promise<boolean> =>
  await Promise.resolve(user.emailVerified);

type AuthPlugins = [
  ReturnType<typeof organization>,
  ReturnType<typeof apiKey>,
  ReturnType<typeof jwt>,
  ReturnType<typeof deviceAuthorization>,
  ReturnType<typeof passkey>,
  ReturnType<typeof admin<Record<never, never>>>,
];

type AuthOptions = Omit<BetterAuthOptions, "plugins"> & {
  plugins: AuthPlugins;
};

const toPlugins = (input: AuthInput): AuthPlugins => [
  organization({
    ac: accessControl,
    allowUserToCreateOrganization: canCreateOrg,
    cancelPendingInvitationsOnReInvite: true,
    creatorRole: "owner",
    dynamicAccessControl: { enabled: false },
    organizationHooks: toOrgHooks(input.members),
    requireEmailVerificationOnInvitation: true,
    roles,
  }),
  apiKey([
    {
      configId: "mcp",
      defaultPrefix: "ds_mcp_",
      deferUpdates: true,
      enableMetadata: false,
      enableSessionForAPIKeys: false,
      rateLimit: MCP_KEY_RATE,
      references: "organization",
    },
  ]),
  jwt({
    jwt: {
      audience: "device",
      expirationTime: JWT_TTL,
      issuer: input.settings.authUrl,
    },
  }),
  deviceAuthorization({ expiresIn: DEVICE_CODE_TTL }),
  passkey({
    origin: input.settings.webOrigin,
    rpID: input.settings.rpId,
    rpName: "Design Studio",
  }),
  admin(),
];

const toAuthOptions = (input: AuthInput): AuthOptions => ({
  account: {
    accountLinking: {
      allowDifferentEmails: false,
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  advanced: {
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: true },
    useSecureCookies: true,
  },
  basePath: "/api/auth",
  baseURL: input.settings.authUrl,
  database: input.database,
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  emailVerification: {
    afterEmailVerification: input.onVerified,
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
  },
  hooks: {
    before: toBeforeHook({ members: input.members, rate: input.rate }),
  },
  plugins: toPlugins(input),
  rateLimit: { enabled: false },
  session: {
    cookieCache: { enabled: true, maxAge: COOKIE_CACHE_SECONDS },
  },
  trustedOrigins: [input.settings.webOrigin],
});

export { toAuthOptions };

export type { AuthInput, AuthOptions, AuthSettings, VerifiedUser };
