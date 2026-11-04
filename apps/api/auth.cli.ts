import { DatabaseSync } from "node:sqlite";

import { betterAuth } from "better-auth";

import type { MemberRoles } from "./src/auth/member-roles.js";
import { toAuthOptions } from "./src/auth/options.js";
import type { RateClient } from "./src/auth/rate-limit.js";

const cliMembers: MemberRoles = {
  countOwners: async () => await Promise.resolve(0),
  createPersonalOrg: async () => {
    await Promise.resolve();
  },
  readRole: async () => await Promise.resolve(null),
  revokeMember: async () => {
    await Promise.resolve();
  },
};

const cliRate: RateClient = {
  hit: async () => await Promise.resolve({ isAllowed: true, retryAfter: 0 }),
};

const auth = betterAuth(
  toAuthOptions({
    database: new DatabaseSync(":memory:"),
    members: cliMembers,
    onVerified: async () => {
      await Promise.resolve();
    },
    rate: cliRate,
    settings: {
      authUrl: "http://localhost:8787",
      rpId: "localhost",
      webOrigin: "http://localhost:5173",
    },
  })
);

export { auth };
