import type { VersionMeta } from "@design-studio/contracts";

type OriginMeta = Pick<VersionMeta, "client" | "origin">;

const toOriginMeta = (meta: VersionMeta | null): OriginMeta => {
  if (meta?.origin === "agent") {
    return { origin: "agent" };
  }

  if (meta?.origin !== "mcp") {
    return {};
  }

  if (meta.client) {
    return { client: meta.client, origin: "mcp" };
  }

  return { origin: "mcp" };
};

export { toOriginMeta };

export type { OriginMeta };
