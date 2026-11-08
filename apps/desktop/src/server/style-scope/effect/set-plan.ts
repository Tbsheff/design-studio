import type { EffectItem, Project, WrittenFile } from "./deps.js";
import { toNamedClass } from "./engine/index.js";
import { EffectError } from "./errors.js";
import { getRule } from "./sheet.js";
import type { SheetRule } from "./sheet.js";

interface EffectTarget {
  readonly selector: string | null;
  readonly source: {
    readonly col: number;
    readonly file: string;
    readonly line: number;
  };
  readonly tag: string | null;
}

interface EffectSetRequest {
  readonly effects: readonly EffectItem[] | null;
  readonly hasStyleName: boolean;
  readonly styleName: string | null;
  readonly target: EffectTarget;
}

interface EffectScope {
  readonly project: Project;
  readonly workTree: string;
}

interface EffectSetPlan {
  readonly className: string | null;
  readonly hasRuntime: boolean;
  readonly styleName: string | null;
  readonly title: string;
  readonly written: WrittenFile[];
}

interface CurrentClasses {
  readonly anon: SheetRule | null;
  readonly named: SheetRule | null;
}

interface ClassChange {
  readonly add: string[];
  readonly remove: string[];
}

interface ClassPair {
  readonly next: string | null;
  readonly old: string | null;
}

const NO_SHEET =
  "The project has no style sheet. Add src/index.css or a styles.css file, or use an HTML page.";

const toCurrent = (
  tokens: readonly string[],
  rules: readonly SheetRule[]
): CurrentClasses => {
  let anon: SheetRule | null = null;
  let named: SheetRule | null = null;

  for (const token of tokens) {
    const rule = getRule(rules, token);

    if (rule !== null && rule.name === null) {
      anon ??= rule;
    }

    if (rule !== null && rule.name !== null) {
      named ??= rule;
    }
  }

  return { anon, named };
};

const toClassChange = (
  tokens: readonly string[],
  pairs: readonly ClassPair[]
): ClassChange => {
  const remove: string[] = [];
  const add: string[] = [];
  const present = new Set(tokens);

  for (const pair of pairs) {
    if (pair.old !== null && pair.old !== pair.next) {
      remove.push(pair.old);
    }

    if (pair.next !== null && !present.has(pair.next)) {
      add.push(pair.next);
    }
  }

  return { add, remove };
};

const toKindsTitle = (
  effects: readonly EffectItem[],
  styleName: string | null
): string => {
  const seen = new Set<string>();

  for (const item of effects) {
    if (item.isEnabled) {
      seen.add(item.kind);
    }
  }

  const kinds = [...seen];

  if (styleName !== null) {
    kinds.push(`style ${styleName}`);
  }

  if (kinds.length === 0) {
    return "Effects: none";
  }

  return `Effects: ${kinds.join(", ")}`;
};

const toNextStyle = (
  request: EffectSetRequest,
  current: CurrentClasses,
  rules: readonly SheetRule[]
): SheetRule | null => {
  if (!request.hasStyleName) {
    return current.named;
  }

  if (request.styleName === null) {
    return null;
  }

  const found = getRule(rules, toNamedClass(request.styleName));

  if (found === null) {
    throw new EffectError(
      `No effect style is named ${request.styleName}. Call list_effect to see the names.`
    );
  }

  return found;
};

export { NO_SHEET, toClassChange, toCurrent, toKindsTitle, toNextStyle };

export type {
  ClassChange,
  ClassPair,
  CurrentClasses,
  EffectScope,
  EffectSetPlan,
  EffectSetRequest,
  EffectTarget,
};
