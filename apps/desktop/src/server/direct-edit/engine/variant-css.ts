import {
  isDataStateName,
  isEdgeStateName,
  toDataStateValue,
  toEdgePseudo,
} from "@design-studio/contracts/state-styles";
import type { DefaultTreeAdapterMap } from "parse5";

import {
  DEFAULT_BREAKPOINTS,
  parseVariant,
  type ParsedVariant,
} from "../../../shared/variants.js";
import {
  applyDeclarationChanges,
  parseDeclarations,
  serializeDeclarations,
} from "./css.js";
import { DirectEditError } from "./errors.js";
import type { Splice } from "./splice.js";

type Document = DefaultTreeAdapterMap["document"];

type ParentNode = DefaultTreeAdapterMap["parentNode"];

type Element = DefaultTreeAdapterMap["element"];

export const VARIANT_STYLE_ATTR = "data-studio-variants";
const KEY_CLASS = /^sv-[a-z0-9]{6}$/;
const CHILD_RULE = " > * + *";

const RULE_LINE =
  /^(?:@media (.+?) \{ )?(\.sv-[a-z0-9]{6}(?:\[data-state="[a-z]+"\])?(?::[a-z-]+(?:\((?:odd|even)\))?)*(?: > \* \+ \*)?) \{ (.*?) \}(?: \})?$/;

interface Rule {
  media: string | null;
  selector: string;
  body: string;
}

function isElement(node: unknown): node is Element {
  return typeof node === "object" && node !== null && "tagName" in node;
}

function findTag(
  root: ParentNode,
  test: (element: Element) => boolean
): Element | null {
  for (const child of root.childNodes) {
    if (!isElement(child)) {
      continue;
    }

    if (test(child)) {
      return child;
    }

    const nested = findTag(child, test);

    if (nested) {
      return nested;
    }
  }

  return null;
}

function breakpointPx(name: string): number {
  const hit = DEFAULT_BREAKPOINTS.find((entry) => entry.name === name);

  if (!hit) {
    throw new DirectEditError(
      "variant_not_supported",
      `${name} is not a breakpoint. Use one of ${DEFAULT_BREAKPOINTS.map((entry) => entry.name).join(", ")}`
    );
  }

  return hit.px;
}

function mediaOf(variant: ParsedVariant): string | null {
  const parts = [
    ...(variant.breakpoint
      ? [`(min-width: ${breakpointPx(variant.breakpoint)}px)`]
      : []),
    ...(variant.dark ? ["(prefers-color-scheme: dark)"] : []),
  ];

  return parts.length > 0 ? parts.join(" and ") : null;
}

function toPseudoPart(state: ParsedVariant["states"][number]): string {
  if (isEdgeStateName(state)) {
    return toEdgePseudo(state);
  }

  return state;
}

function selectorOf(key: string, variant: ParsedVariant): string {
  const data = variant.states
    .filter(isDataStateName)
    .map((state) => `[data-state="${toDataStateValue(state)}"]`);

  const pseudo = variant.states
    .filter((state) => !isDataStateName(state))
    .map((state) => `:${toPseudoPart(state)}`);

  return `.${key}${[...data, ...pseudo].join("")}`;
}

function keyOf(element: Element): string | null {
  const value =
    element.attrs.find((attr) => attr.name === "class")?.value ?? "";

  return value.split(/\s+/).find((token) => KEY_CLASS.test(token)) ?? null;
}

function keySplice(element: Element, key: string): Splice {
  const attr = element.attrs.find((entry) => entry.name === "class");
  const location = element.sourceCodeLocation;
  const startTag = location?.startTag;

  if (!startTag) {
    throw new DirectEditError(
      "element_not_found",
      "The element has no source location"
    );
  }

  const attrLocation = location.attrs?.class;

  if (attr && attrLocation) {
    const text = attr.value.trim() === "" ? key : `${attr.value.trim()} ${key}`;

    return {
      start: attrLocation.startOffset,
      end: attrLocation.endOffset,
      text: `class="${text.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"`,
    };
  }

  const at = startTag.startOffset + 1 + element.tagName.length;

  return { start: at, end: at, text: ` class="${key}"` };
}

function readRules(text: string): Rule[] {
  return text
    .split("\n")
    .map((line) => RULE_LINE.exec(line.trim()))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({
      media: match[1] ?? null,
      selector: match[2] ?? "",
      body: match[3] ?? "",
    }));
}

function rank(rule: Rule): [number, number, number] {
  const width = /min-width: (\d+)px/.exec(rule.media ?? "")?.[1];

  return [
    width ? Number(width) : 0,
    rule.media?.includes("prefers-color-scheme") ? 1 : 0,
    rule.selector.split(":").length,
  ];
}

function compareRules(a: Rule, b: Rule): number {
  const ra = rank(a);
  const rb = rank(b);

  return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2];
}

function writeRules(rules: Rule[]): string {
  const lines = [...rules]
    .sort(compareRules)
    .map((rule) =>
      rule.media
        ? `@media ${rule.media} { ${rule.selector} { ${rule.body} } }`
        : `${rule.selector} { ${rule.body} }`
    );

  return `\n${lines.join("\n")}\n`;
}

function styleBlockSplice(
  source: string,
  document: Document,
  rules: Rule[]
): Splice {
  const block = findTag(
    document,
    (element) =>
      element.tagName === "style" &&
      element.attrs.some((attr) => attr.name === VARIANT_STYLE_ATTR)
  );

  const content = writeRules(rules);
  const location = block?.sourceCodeLocation;

  if (block && location?.startTag && location.endTag) {
    return {
      start: location.startTag.endOffset,
      end: location.endTag.startOffset,
      text: content,
    };
  }

  const tag = `<style ${VARIANT_STYLE_ATTR}>${content}</style>`;

  const body = findTag(document, (element) => element.tagName === "body")
    ?.sourceCodeLocation?.endTag;

  if (body) {
    return { start: body.startOffset, end: body.startOffset, text: `${tag}\n` };
  }

  if (source.trim() === "") {
    throw new DirectEditError(
      "variant_not_supported",
      "This file is empty, so it has no place for a style rule"
    );
  }

  return { start: source.length, end: source.length, text: `\n${tag}\n` };
}

function currentRules(document: Document): Rule[] {
  const block = findTag(
    document,
    (element) =>
      element.tagName === "style" &&
      element.attrs.some((attr) => attr.name === VARIANT_STYLE_ATTR)
  );

  const text =
    block?.childNodes
      .map((node) => ("value" in node ? String(node.value) : ""))
      .join("") ?? "";

  return readRules(text);
}

interface RuleTarget {
  readonly document: Document;
  readonly element: Element;
  readonly raw: string;
  readonly suffix: string;
}

interface RuleEdit extends RuleTarget {
  readonly source: string;
  readonly toBody: (before: string) => string;
}

const toVariantOf = (raw: string): ParsedVariant => {
  const variant = parseVariant(raw);

  if (!variant) {
    throw new DirectEditError("invalid_request", `Unknown variant ${raw}`);
  }

  return variant;
};

const toRuleSplices = (edit: RuleEdit): Splice[] => {
  const variant = toVariantOf(edit.raw);
  const existing = keyOf(edit.element);
  const key = existing ?? `sv-${globalThis.crypto.randomUUID().slice(0, 6)}`;
  const media = mediaOf(variant);
  const selector = `${selectorOf(key, variant)}${edit.suffix}`;
  const rules = currentRules(edit.document);

  const index = rules.findIndex(
    (rule) => rule.selector === selector && rule.media === media
  );

  const body = edit.toBody(rules[index]?.body ?? "");
  const next = rules.filter((_, at) => at !== index);

  if (body !== "") {
    next.push({ media, selector, body });
  }

  const splices = [styleBlockSplice(edit.source, edit.document, next)];

  if (!existing) {
    splices.push(keySplice(edit.element, key));
  }

  return splices;
};

const toMediaOrNull = (variant: ParsedVariant): string | null | false => {
  try {
    return mediaOf(variant);
  } catch {
    return false;
  }
};

const toRuleBody = (target: RuleTarget): string | null => {
  const variant = parseVariant(target.raw);
  const key = keyOf(target.element);

  if (!variant || !key) {
    return null;
  }

  const media = toMediaOrNull(variant);

  if (media === false) {
    return null;
  }

  const selector = `${selectorOf(key, variant)}${target.suffix}`;

  const rule = currentRules(target.document).find(
    (entry) => entry.selector === selector && entry.media === media
  );

  return rule?.body ?? null;
};

const toPropList = (body: string | null): { prop: string; value: string }[] => {
  if (body === null) {
    return [];
  }

  return parseDeclarations(body)
    .filter((entry) => entry.prop !== "")
    .map((entry) => ({ prop: entry.prop, value: entry.value }));
};

export function variantCssSplices(
  source: string,
  document: Document,
  element: Element,
  style: Record<string, string | null>,
  raw: string
): Splice[] {
  return toRuleSplices({
    document,
    element,
    raw,
    source,
    suffix: "",
    toBody: (before) =>
      serializeDeclarations(
        applyDeclarationChanges(parseDeclarations(before), style)
      ),
  });
}

export const toChildRuleSplices = (
  target: Omit<RuleEdit, "suffix" | "toBody">,
  body: string
): Splice[] =>
  toRuleSplices({ ...target, suffix: CHILD_RULE, toBody: () => body });

export const toChildRuleDeclarations = (
  target: Omit<RuleTarget, "suffix">
): { prop: string; value: string }[] =>
  toPropList(toRuleBody({ ...target, suffix: CHILD_RULE }));

export function variantCssProps(
  document: Document,
  element: Element,
  raw: string
): { prop: string; value: string }[] {
  return toPropList(toRuleBody({ document, element, raw, suffix: "" }));
}
