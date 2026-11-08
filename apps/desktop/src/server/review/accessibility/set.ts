import {
  commitAccessibilityEdit,
  guardAccessibilityEdit,
  jsxElementAt,
  jsxTagName,
  loadAccessibilitySite,
  setHtmlAttrs,
  setJsxAttrs,
} from "./deps.js";
import type {
  AccessibilityChanges,
  AccessibilityScope,
  AccessibilitySetResult,
  AttrChanges,
  DirectEditDeps,
  SourceLoc,
  Version,
  WrittenFile,
} from "./deps.js";
import { AccessibilityError } from "./errors.js";

interface AccessibilityTarget {
  readonly source: SourceLoc;
  readonly tag: string | null;
  readonly usedAt: SourceLoc | null;
}

interface AccessibilitySetRequest {
  readonly changes: AccessibilityChanges;
  readonly target: AccessibilityTarget;
}

interface AccessibilityPlan {
  readonly attributes: Readonly<Record<string, string | null>>;
  readonly site: AccessibilitySetResult["site"];
  readonly source: SourceLoc;
  readonly title: string;
  readonly written: WrittenFile[];
}

interface AccessibilityDone {
  readonly plan: AccessibilityPlan;
  readonly version: Version;
}

type AttrValue = number | string | null;

interface AttributeEdits {
  [name: string]: AttrValue | undefined;
  alt?: AttrValue;
  "aria-label"?: AttrValue;
  role?: AttrValue;
  tabIndex?: AttrValue;
  tabindex?: AttrValue;
}

interface PickedSite {
  readonly site: AccessibilitySetResult["site"];
  readonly source: SourceLoc;
}

const SAME = "The layer already has these accessibility values.";

const NOT_IMAGE =
  "alt works only on an <img>, an <input type=image>, an <area> or a component call site. Use ariaLabel for this layer.";

const IMAGE_TAGS = new Set(["img", "area", "input"]);

const HTML_FILE = /\.html?$/iu;

const TS_FILE = /\.tsx$/iu;

const toPickSite = (target: AccessibilityTarget): PickedSite => {
  if (target.usedAt !== null && target.usedAt.file !== target.source.file) {
    return { site: "use", source: target.usedAt };
  }

  return { site: "element", source: target.source };
};

const toTabIndexName = (html: boolean): string => {
  if (html) {
    return "tabindex";
  }

  return "tabIndex";
};

const toAttributesOf = (
  changes: AccessibilityChanges,
  html: boolean
): AttributeEdits => {
  const out: AttributeEdits = {};

  if ("ariaLabel" in changes) {
    out["aria-label"] = changes.ariaLabel ?? null;
  }

  if ("role" in changes) {
    out.role = changes.role ?? null;
  }

  if ("alt" in changes) {
    out.alt = changes.alt ?? null;
  }

  if ("tabIndex" in changes) {
    out[toTabIndexName(html)] = changes.tabIndex ?? null;
  }

  return out;
};

const toHtmlValues = (
  attributes: AttributeEdits
): Record<string, string | null> =>
  Object.fromEntries(
    Object.entries(attributes).map(([name, value]) => {
      if ((value ?? null) === null) {
        return [name, null];
      }

      return [name, String(value)];
    })
  );

const toHostTagOf = (
  code: string,
  source: SourceLoc,
  html: boolean,
  fallback: string | null
): string | null => {
  if (html) {
    return fallback;
  }

  const tag = jsxTagName(jsxElementAt(code, source, TS_FILE.test(source.file)));

  if (tag.host) {
    return tag.name.toLowerCase();
  }

  return null;
};

const toCheckAlt = (
  changes: AccessibilityChanges,
  host: string | null
): void => {
  if ((changes.alt ?? null) === null || host === null) {
    return;
  }

  if (!IMAGE_TAGS.has(host)) {
    throw new AccessibilityError(NOT_IMAGE);
  }
};

const toTitleOf = (attributes: AttributeEdits): string => {
  const parts = Object.entries(attributes).map(([name, value]) => {
    if ((value ?? null) === null) {
      return `remove ${name}`;
    }

    return `${name} ${String(value)}`;
  });

  return `Accessibility: ${parts.join(", ")}`;
};

const toPatched = (
  code: string,
  source: SourceLoc,
  html: boolean,
  attributes: AttributeEdits
): string => {
  const position = { col: source.col, line: source.line };

  if (html) {
    return setHtmlAttrs(code, position, toHtmlValues(attributes));
  }

  return setJsxAttrs(
    code,
    position,
    TS_FILE.test(source.file),
    attributes as AttrChanges
  );
};

const toPlanAccessibility = async (
  scope: AccessibilityScope,
  request: AccessibilitySetRequest
): Promise<AccessibilityPlan> => {
  const picked = toPickSite(request.target);
  const site = await loadAccessibilitySite(scope, picked.source);
  const html = HTML_FILE.test(site.relative);
  const editSource = { ...picked.source, file: site.relative };
  const tag = toHostTagOf(site.code, editSource, html, request.target.tag);

  toCheckAlt(request.changes, tag);

  const attributes = toAttributesOf(request.changes, html);
  const code = toPatched(site.code, editSource, html, attributes);

  if (code === site.code) {
    throw new AccessibilityError(SAME);
  }

  return {
    attributes: toHtmlValues(attributes),
    site: picked.site,
    source: editSource,
    title: toTitleOf(attributes),
    written: [
      {
        code,
        original: site.code,
        target: { file: site.file, relative: site.relative },
      },
    ],
  };
};

const setAccessibilityAttributes = async (
  deps: DirectEditDeps,
  scope: AccessibilityScope,
  request: AccessibilitySetRequest
): Promise<AccessibilityDone> => {
  guardAccessibilityEdit(deps, scope);

  const plan = await toPlanAccessibility(scope, request);

  const version = await commitAccessibilityEdit(
    deps,
    scope,
    plan.written,
    plan.title
  );

  return { plan, version };
};

const toAccessibilityResult = (
  plan: AccessibilityPlan,
  version: Version | null
): AccessibilitySetResult => ({
  attributes: plan.attributes,
  file: plan.source.file,
  site: plan.site,
  source: plan.source,
  title: plan.title,
  versionId: version?.id ?? null,
});

export {
  toPlanAccessibility as planAccessibility,
  setAccessibilityAttributes,
  toAccessibilityResult,
};

export type {
  AccessibilityDone,
  AccessibilityPlan,
  AccessibilitySetRequest,
  AccessibilityTarget,
};
