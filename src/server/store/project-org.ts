import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "../platform/config/index.js";
import { isOrgInScope } from "./org-scope.js";
import type { OrgScope } from "./org-scope.js";
import { LOCAL_ORG_ID } from "./org-visibility.js";

const BINDINGS_FILE = "bindings.json";

const readBindingsText = async (dataDir: string): Promise<string | null> => {
  try {
    return await readFile(path.join(dataDir, BINDINGS_FILE), "utf-8");
  } catch {
    return null;
  }
};

const toBindingOrgs = (text: string): Map<string, string> => {
  const orgs = new Map<string, string>();

  try {
    const parsed = JSON.parse(text) as {
      bindings?: Record<string, { orgId?: string }>;
    };

    for (const [keyText, binding] of Object.entries(parsed.bindings ?? {})) {
      const orgId = binding.orgId ?? null;

      if (orgId !== null && keyText.startsWith(`${orgId}:`)) {
        orgs.set(keyText.slice(orgId.length + 1), orgId);
      }
    }
  } catch {
    return orgs;
  }

  return orgs;
};

const readProjectOrg = async (projectId: string): Promise<string | null> => {
  const text = await readBindingsText(loadConfig().dataDir);

  if (text === null) {
    return null;
  }

  return toBindingOrgs(text).get(projectId) ?? null;
};

const isProjectInScope = async (
  scope: OrgScope,
  projectId: string
): Promise<boolean> => {
  if (scope.kind === "all") {
    return true;
  }

  const orgId = (await readProjectOrg(projectId)) ?? LOCAL_ORG_ID;

  return isOrgInScope(scope, orgId);
};

export { isProjectInScope, readProjectOrg };
