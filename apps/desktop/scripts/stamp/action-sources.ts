import { readFile } from "node:fs/promises";
import path from "node:path";

import { ACTION_ROOT } from "./action-index.js";
import type { Field } from "./templates.js";

type Scope = "project" | "org" | "device";

interface PermissionSets {
  readonly all: Set<string>;
  readonly confirm: Set<string>;
}

const PARAM = /:(?<name>[A-Za-z]\w*)/gu;

const ID_EXPORT = /const (?<name>[A-Z]\w*)IdSchema\b/gu;

const QUOTED = /"(?<value>[\w.]+)"/gu;

const quoted = (part: string): string[] =>
  [...part.matchAll(QUOTED)].map((match) => match.groups?.["value"] ?? "");

const pathParams = (route: string): string[] =>
  [...route.matchAll(PARAM)].map((match) => match.groups?.["name"] ?? "");

const readIdFields = async (): Promise<Map<string, string>> => {
  const source = await readFile(
    path.join(ACTION_ROOT, "_core/ids.ts"),
    "utf-8"
  );

  const found = new Map<string, string>();

  for (const match of source.matchAll(ID_EXPORT)) {
    const noun = match.groups?.["name"] ?? "";

    if (noun !== "Safe") {
      const field = `${noun.charAt(0).toLowerCase()}${noun.slice(1)}Id`;

      found.set(field, `${noun}IdSchema`);
    }
  }

  return found;
};

const inputFields = async (route: string, scope: Scope): Promise<Field[]> => {
  const ids = await readIdFields();
  const names = new Set(pathParams(route));

  if (scope === "project") {
    names.add("projectId");
  }

  return [...names].map((name) => ({
    name,
    schema: ids.get(name) ?? "Schema.String",
  }));
};

const readPermissions = async (): Promise<PermissionSets> => {
  const source = await readFile(
    path.join(ACTION_ROOT, "_core/permissions.ts"),
    "utf-8"
  );

  const [confirmPart = "", rest = ""] = source.split("const PERMISSIONS");

  const confirm = new Set(quoted(confirmPart));

  return { all: new Set([...confirm, ...quoted(rest)]), confirm };
};

export { inputFields, pathParams, readPermissions };
