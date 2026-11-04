import { actionConst, camel, pascal } from "../gen-common.js";

const READ_VERBS = ["get", "list", "search", "inspect"] as const;

const WRITE_VERBS = [
  "create",
  "update",
  "set",
  "insert",
  "rename",
  "move",
  "duplicate",
  "delete",
  "restore",
] as const;

const RUN_VERBS = [
  "start",
  "stop",
  "run",
  "apply",
  "export",
  "import",
  "publish",
  "unpublish",
  "share",
] as const;

const VERBS: readonly string[] = [...READ_VERBS, ...WRITE_VERBS, ...RUN_VERBS];

const VERB_PATTERN = /^[a-z][A-Za-z]*$/u;
const DOMAIN_PATTERN = /^[a-z][a-z-]*$/u;
const WORD_BREAK = /(?<lower>[a-z0-9])(?<upper>[A-Z])/gu;

interface VerbSplit {
  readonly object: string | null;
  readonly verb: string;
}

interface VerbCheck {
  readonly error: string | null;
  readonly split: VerbSplit | null;
}

interface DerivedNames {
  readonly constName: string;
  readonly domain: string;
  readonly handlerFile: string;
  readonly hook: string;
  readonly hookName: string;
  readonly id: string;
  readonly inputType: string;
  readonly outputType: string;
  readonly tail: string;
  readonly tool: string;
  readonly definitionFile: string;
  readonly verb: string;
}

const kebab = (name: string): string =>
  name.replaceAll(WORD_BREAK, "$<lower>-$<upper>").toLowerCase();

const snake = (name: string): string => kebab(name).replaceAll("-", "_");

const splitVerb = (name: string): VerbSplit | null => {
  const head =
    VERBS.find(
      (verb) =>
        name === verb ||
        (name.startsWith(verb) && /^[A-Z]/u.test(name.slice(verb.length)))
    ) ?? null;

  if (head === null) {
    return null;
  }

  const rest = name.slice(head.length);

  if (rest === "") {
    return { object: null, verb: head };
  }

  return { object: rest, verb: head };
};

const checkVerb = (name: string): VerbCheck => {
  if (!VERB_PATTERN.test(name)) {
    return {
      error: `The verb "${name}" is not camelCase. fix: use a name like moveLayer`,
      split: null,
    };
  }

  const split = splitVerb(name);

  if (split === null) {
    return {
      error: `The verb "${name}" is not in the N3 list. fix: start it with one of ${VERBS.join(", ")}`,
      split: null,
    };
  }

  return { error: null, split };
};

const checkDomain = (domain: string): string | null => {
  if (DOMAIN_PATTERN.test(domain)) {
    return null;
  }

  return `The domain "${domain}" is not kebab-case. fix: use lowercase words joined by -`;
};

const deriveNames = (domain: string, verb: string): DerivedNames => {
  const tail = kebab(verb);
  const constName = actionConst(domain, tail);
  const typeBase = pascal(constName);

  const definitionFile = `src/shared/actions/${domain}/${tail}.ts`;
  const handlerFile = `src/server/handlers/${domain}/${tail}.ts`;
  const hook = `useAction(${constName})`;
  const hookName = `use${typeBase}`;
  const id = `${domain}.${verb}`;
  const inputType = `${typeBase}Input`;
  const outputType = `${typeBase}Output`;
  const tool = `${snake(verb)}_${snake(camel(domain))}`;

  return {
    constName,
    definitionFile,
    domain,
    handlerFile,
    hook,
    hookName,
    id,
    inputType,
    outputType,
    tail,
    tool,
    verb,
  };
};

export {
  READ_VERBS,
  RUN_VERBS,
  VERBS,
  WRITE_VERBS,
  checkDomain,
  checkVerb,
  deriveNames,
  kebab,
  snake,
  splitVerb,
};

export type { DerivedNames, VerbCheck, VerbSplit };
