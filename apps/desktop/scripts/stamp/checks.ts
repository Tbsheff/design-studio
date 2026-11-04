import { fail } from "./args.js";

const CLASS_PATTERN = /^[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]*)*$/u;
const BANNED_TAIL = /(?:Shape|Service|Manager)$/u;
const KEBAB_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const FIELD_PATTERN = /^[a-z][A-Za-z0-9]*$/u;

interface FieldPair {
  readonly name: string;
  readonly schema: string;
}

const checkClassName = (name: string): void => {
  if (!CLASS_PATTERN.test(name)) {
    fail(
      `The class name "${name}" is not PascalCase.`,
      "use words that each start with a capital letter, for example ProjectStore"
    );
  }

  if (BANNED_TAIL.test(name)) {
    fail(
      `The class name "${name}" ends in Shape, Service or Manager.`,
      "use a role word: Store, Runner, Watcher, Queue, Client or Cache"
    );
  }
};

const checkKebab = (kind: string, name: string): void => {
  if (!KEBAB_PATTERN.test(name)) {
    fail(
      `The ${kind} "${name}" is not kebab-case.`,
      "use lowercase words joined by -"
    );
  }
};

const toSchema = (text: string): string => {
  if (text.startsWith("Schema.")) {
    return text;
  }

  return `Schema.${text}`;
};

const parseField = (entry: string): FieldPair => {
  const [name = "", ...rest] = entry.split(":");
  const schema = rest.join(":").trim();

  if (!FIELD_PATTERN.test(name) || name === "message" || schema === "") {
    return fail(
      `The field "${entry}" is not name:Schema, or it uses the name message.`,
      "use --field candidates:Array(Schema.String)"
    );
  }

  return { name, schema: toSchema(schema) };
};

export { checkClassName, checkKebab, parseField };

export type { FieldPair };
