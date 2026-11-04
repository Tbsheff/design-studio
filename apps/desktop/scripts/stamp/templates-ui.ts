import { pascal } from "../gen-common.js";
import { kebab } from "./names.js";
import type { DerivedNames } from "./names.js";

interface UiHookSpec {
  readonly access: "read" | "edit" | "destructive";
  readonly names: DerivedNames;
}

interface CopyEntry {
  readonly key: string;
  readonly text: string;
}

const SHARED = "@design-studio/actions";

const text = (...rows: string[]): string => `${rows.join("\n")}\n`;

const quote = (value: string): string => JSON.stringify(value);

const uiHookRead = (names: DerivedNames): string =>
  text(
    `import type { ${names.constName} } from "${SHARED}/${names.domain}/${names.tail}";`,
    `import type { WireInput } from "${SHARED}/_core/action";`,
    `import { routes } from "${SHARED}/${names.domain}/routes";`,
    `import type { CallOutput } from "../../platform/http.js";`,
    `import { useAction } from "../../platform/query.js";`,
    `import type { QueryState } from "../../platform/query.js";`,
    "",
    `const ${names.hookName} = (`,
    `  input: WireInput<typeof ${names.constName}>`,
    `): QueryState<CallOutput<typeof routes.${names.constName}>> =>`,
    `  useAction(routes.${names.constName}, input);`,
    "",
    `export { ${names.hookName} };`
  );

const uiHookWrite = (names: DerivedNames): string =>
  text(
    `import { routes } from "${SHARED}/${names.domain}/routes";`,
    `import { useAction } from "../../platform/query.js";`,
    `import type { ActionCall } from "../../platform/query.js";`,
    "",
    `const ${names.hookName} = (): ActionCall<typeof routes.${names.constName}> =>`,
    `  useAction(routes.${names.constName});`,
    "",
    `export { ${names.hookName} };`
  );

const uiHook = (spec: UiHookSpec): string => {
  if (spec.access === "read") {
    return uiHookRead(spec.names);
  }

  return uiHookWrite(spec.names);
};

const uiFeatureIndex = (component: string): string =>
  text(
    `import { lazy } from "react";`,
    "",
    `const ${component} = lazy(async () => {`,
    `  const loaded = await import("./${kebab(component)}.js");`,
    "",
    `  return { default: loaded.${component} };`,
    "});",
    "",
    `export { ${component} };`
  );

const uiCopy = (entries: readonly CopyEntry[]): string =>
  text(
    "const copy = {",
    ...[...entries]
      .toSorted((left, right) => left.key.localeCompare(right.key))
      .map((entry) => `  ${entry.key}: ${quote(entry.text)},`),
    "} as const;",
    "",
    "export { copy };"
  );

const element = (name: string, attributes: string): string =>
  ["<", name, attributes, ">"].join("");

const uiComponent = (component: string): string =>
  text(
    `import type { ReactElement } from "react";`,
    "",
    `import { copy } from "./copy.js";`,
    "",
    `const ${component} = (): ReactElement => (`,
    `  ${element("ul", ' className="ui-menu"')}`,
    `    ${element("li", "")}{copy.title}${element("/li", "")}`,
    `  ${element("/ul", "")}`,
    ");",
    "",
    `export { ${component} };`
  );

const uiModel = (feature: string): string => {
  const name = `to${pascal(feature)}Title`;

  return text(
    `const ${name} = (value: string): string => value.trim();`,
    "",
    `export { ${name} };`
  );
};

export { uiComponent, uiCopy, uiFeatureIndex, uiHook, uiModel };

export type { CopyEntry, UiHookSpec };
