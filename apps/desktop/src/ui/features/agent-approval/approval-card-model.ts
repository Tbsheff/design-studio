import type { PermissionCard } from "./deps.js";

interface ApprovalRow {
  readonly label: string | null;
  readonly value: string;
}

const LABEL_MAX_CHARS = 24;
const SEPARATOR = ": ";

const toApprovalRow = (line: string): ApprovalRow => {
  const at = line.indexOf(SEPARATOR);

  if (at > 0 && at <= LABEL_MAX_CHARS) {
    return {
      label: line.slice(0, at),
      value: line.slice(at + SEPARATOR.length),
    };
  }

  return { label: null, value: line };
};

const toApprovalRows = (card: PermissionCard): ApprovalRow[] =>
  card.detail
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => toApprovalRow(line));

export { toApprovalRows };

export type { ApprovalRow };
