import path from "node:path";

import type { DirectStyleProperty } from "@design-studio/contracts";

import type { RenderPage } from "../../shared/server-ports.js";
import { parseLoc } from "./checks.js";
import type { Draft } from "./checks.js";
import type { ProbeElement, TokenHit } from "./probe.js";

interface RuleOrigin {
  readonly href: string | null;
  readonly index: number;
}

const HTML_FILE = /\.html?$/iu;

const REMOTE_HREF = /^(?:[a-z]+:)?\/\//iu;

const STYLE_TAG = "style";

const toRuleOriginExpression = (rules: readonly string[]): string =>
  `(() => ${JSON.stringify(rules)}.map((wanted) => { for (const sheet of document.styleSheets) { let rules = []; try { rules = [...sheet.cssRules]; } catch { continue; } const index = rules.findIndex((rule) => rule instanceof CSSStyleRule && rule.selectorText === wanted); if (index === -1) continue; const owner = sheet.ownerNode; if (owner && owner.tagName === 'STYLE') return { href: null, index }; if (owner && owner.tagName === 'LINK') return { href: owner.getAttribute('href'), index }; return null; } return null; }))()`;

const isSingleRule = (hit: TokenHit): hit is TokenHit & { rule: string } =>
  hit.via === "rule" && Boolean(hit.rule) && !hit.rule?.includes(",");

const toRuleOrigins = async (
  page: RenderPage,
  hits: readonly TokenHit[]
): Promise<Map<string, RuleOrigin>> => {
  const rules = [
    ...new Set(
      hits.flatMap((hit) => {
        if (isSingleRule(hit)) {
          return [hit.rule];
        }

        return [];
      })
    ),
  ];

  if (rules.length === 0) {
    return new Map();
  }

  const found = await page.evaluate<(RuleOrigin | null)[]>(
    toRuleOriginExpression(rules)
  );

  return new Map(
    rules.flatMap((rule, index) => {
      const origin = found[index] ?? null;

      if (origin === null) {
        return [];
      }

      return [[rule, origin] as const];
    })
  );
};

const toRuleFile = (page: string, origin: RuleOrigin): string | null => {
  if (origin.href === null) {
    return page;
  }

  const href = origin.href.split(/[?#]/u)[0] ?? "";

  if (href === "" || REMOTE_HREF.test(href)) {
    return null;
  }

  if (href.startsWith("/")) {
    return path.posix.normalize(href.slice(1));
  }

  return path.posix.join(path.posix.dirname(page), href);
};

interface RuleFixInput {
  readonly el: ProbeElement;
  readonly family: DirectStyleProperty;
  readonly hit: TokenHit;
  readonly origins: ReadonlyMap<string, RuleOrigin>;
  readonly target: string;
}

const toRuleFix = (input: RuleFixInput): Draft["fix"] => {
  const { el, family, hit, origins, target } = input;
  const loc = parseLoc(el.loc ?? el.nearLoc ?? null);
  const origin = origins.get(hit.rule ?? "") ?? null;

  if (!isSingleRule(hit) || loc === null || origin === null) {
    return null;
  }

  if (!HTML_FILE.test(loc.file)) {
    return null;
  }

  const file = toRuleFile(loc.file, origin);

  if (file === null) {
    return null;
  }

  const style: Partial<Record<DirectStyleProperty, string>> = {
    [family]: target,
  };

  const col = origin.index + 1;
  const line = 1;
  const selector = hit.rule;
  const tag = STYLE_TAG;
  const source = { col, file, line };

  return {
    edit: { selector, source, style, tag },
    label: `Use ${target}`,
  };
};

export { toRuleFix, toRuleOrigins };

export type { RuleOrigin };
