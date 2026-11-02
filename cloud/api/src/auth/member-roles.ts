interface RoleRow {
  readonly role: string;
}

interface CountRow {
  readonly total: number;
}

interface PersonalUser {
  readonly id: string;
  readonly name: string;
}

interface MemberRoles {
  readonly createPersonalOrg: (user: PersonalUser) => Promise<void>;
  readonly countOwners: (orgId: string) => Promise<number>;
  readonly readRole: (orgId: string, userId: string) => Promise<string | null>;
  readonly revokeMember: (orgId: string, userId: string) => Promise<void>;
}

const OWNER = "owner";

const hasOwner = (role: string | null): boolean =>
  (role ?? "").split(",").some((part) => part.trim() === OWNER);

const toPersonalOrgId = (user: PersonalUser): string => `personal-${user.id}`;

const toMemberRoles = (db: D1Database): MemberRoles => ({
  countOwners: async (orgId) => {
    const row = await db
      .prepare(
        "SELECT COUNT(*) AS total FROM \"member\" WHERE \"organizationId\" = ? AND (',' || \"role\" || ',') LIKE '%,owner,%'"
      )
      .bind(orgId)
      .first<CountRow>();

    return row?.total ?? 0;
  },
  createPersonalOrg: async (user) => {
    const orgId = toPersonalOrgId(user);
    const now = new Date().toISOString();

    await db.batch([
      db
        .prepare(
          'INSERT OR IGNORE INTO "organization" ("id", "name", "slug", "createdAt") VALUES (?, ?, ?, ?)'
        )
        .bind(orgId, user.name, orgId, now),
      db
        .prepare(
          'INSERT OR IGNORE INTO "member" ("id", "organizationId", "userId", "role", "createdAt") VALUES (?, ?, ?, \'owner\', ?)'
        )
        .bind(`${orgId}-owner`, orgId, user.id, now),
    ]);
  },
  readRole: async (orgId, userId) => {
    const row = await db
      .prepare(
        'SELECT "role" FROM "member" WHERE "organizationId" = ? AND "userId" = ?'
      )
      .bind(orgId, userId)
      .first<RoleRow>();

    return row?.role ?? null;
  },
  revokeMember: async (orgId, userId) => {
    await db.batch([
      db
        .prepare(
          'DELETE FROM "apikey" WHERE "referenceId" = ? AND "id" IN (SELECT key_id FROM key_meta WHERE org_id = ? AND acting_user_id = ?)'
        )
        .bind(orgId, orgId, userId),
      db
        .prepare(
          'UPDATE "invitation" SET "status" = \'canceled\' WHERE "organizationId" = ? AND "inviterId" = ? AND "status" = \'pending\''
        )
        .bind(orgId, userId),
    ]);
  },
});

export { OWNER, hasOwner, toMemberRoles, toPersonalOrgId };

export type { MemberRoles, PersonalUser };
