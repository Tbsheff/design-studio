import type { DirectStyleProperty } from "@design-studio/contracts";

import { colorHex } from "../../../shared/token-match.js";
import { copy } from "./copy.js";
import type { LintIssue } from "./deps.js";

const LINT_SHOWN = 3;
const BOX_SIDE_COUNT = 4;

const PROP_LABEL: Partial<Record<DirectStyleProperty, string>> = {
  "background-color": "Fill",
  "border-color": "Border",
  "border-radius": "Radius",
  color: "Text color",
  "font-family": "Font",
  "font-size": "Font size",
  gap: "Gap",
};

const toSideList = (sides: string[]): string => {
  if (sides.length > 1) {
    return `${sides.slice(0, -1).join(", ")} and ${sides.at(-1)}`;
  }

  return sides[0] ?? "";
};

const toBoxLabel = (name: string, props: DirectStyleProperty[]): string => {
  if (props.length === BOX_SIDE_COUNT) {
    return name;
  }

  const sides = props.map((prop) => prop.slice(prop.indexOf("-") + 1));

  return `${name} ${toSideList(sides)}`;
};

const toPropsLabel = (props: DirectStyleProperty[]): string => {
  const first = props[0] ?? "color";

  if (first.startsWith("padding-")) {
    return toBoxLabel("Padding", props);
  }

  if (first.startsWith("margin-")) {
    return toBoxLabel("Margin", props);
  }

  return PROP_LABEL[first] ?? first;
};

const toShownValue = (issue: LintIssue): string => {
  if (issue.kind === "color") {
    return colorHex(issue.value) ?? issue.value;
  }

  if (issue.kind === "font") {
    return (
      issue.value
        .split(",")[0]
        ?.trim()
        .replaceAll(/^['"]|['"]$/gu, "") ?? issue.value
    );
  }

  return issue.value;
};

const toHeadText = (count: number): string => {
  if (count === 1) {
    return copy.oneValueNotToken;
  }

  return `${count} ${copy.valuesAreNotTokens}`;
};

const toMoreText = (isAll: boolean, count: number): string => {
  if (isAll) {
    return copy.showFewer;
  }

  return `Show ${count - LINT_SHOWN} more`;
};

const toUseTokenLabel = (issue: LintIssue, label: string): string =>
  `Use ${issue.token.cssVar} for ${label.toLowerCase()}`;

export {
  LINT_SHOWN,
  toHeadText,
  toMoreText,
  toPropsLabel,
  toShownValue,
  toUseTokenLabel,
};
