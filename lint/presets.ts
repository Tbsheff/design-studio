import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import react from "ultracite/oxlint/react";
import vitest from "ultracite/oxlint/vitest";

import type { OxlintOverride } from "oxlint";

export const js = selectJsPlugins(["github", "sonarjs", "react-doctor"]);

export { antiSlop, core, jsPluginSettings, react, vitest };

export const presetRules: Record<string, unknown> = {
  ...core.rules,
  ...react.rules,
  ...js.rules,
  ...antiSlop.rules,
};

export const vitestRules: NonNullable<OxlintOverride["rules"]> = Object.assign({}, ...(vitest.overrides ?? []).map((entry) => entry.rules ?? {}));
