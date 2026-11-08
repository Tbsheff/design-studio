import { toImportClauses } from "./import-scan.js";
import type { ImportClause } from "./import-scan.js";

const NEUTRAL_SOURCES = /^(?:react|react\/.*|react-dom.*|next|next\/.*)$/u;

const AUTH_WORDS = /session|auth|cookie|sign-?in|login|token/iu;

const PUBLIC_GROUP = /auth|public|marketing|login|sign|landing|legal/iu;

const TAG_ENDINGS = [" ", ">", "/", "\n", "."] as const;

const isUsedAsTag = (code: string, name: string): boolean =>
  TAG_ENDINGS.some((ending) => code.includes(`<${name}${ending}`));

const toLocalNames = (clause: ImportClause): readonly string[] => {
  const names = clause.names.map((name) => name.local);

  if (clause.defaultName === null) {
    return names;
  }

  return [clause.defaultName, ...names];
};

const toClauseComponents = (
  clause: ImportClause,
  layoutCode: string
): readonly string[] => {
  if (NEUTRAL_SOURCES.test(clause.source)) {
    return [];
  }

  return toLocalNames(clause).filter(
    (local) => /^[A-Z]/u.test(local) && isUsedAsTag(layoutCode, local)
  );
};

const toShellComponents = (layoutCode: string): readonly string[] => {
  const found = toImportClauses(layoutCode).flatMap((clause) =>
    toClauseComponents(clause, layoutCode)
  );

  return [...new Set(found)];
};

const isAuthRequiredFor = (
  guardCode: string | null,
  groupName: string
): boolean => {
  if (guardCode === null || !AUTH_WORDS.test(guardCode)) {
    return false;
  }

  return !PUBLIC_GROUP.test(groupName);
};

export { isAuthRequiredFor, toShellComponents };
