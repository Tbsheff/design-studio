import { Schema } from "effect";

import { extractJson } from "../../shared/extract-json.js";
import { toDecoder } from "../platform/decode/index.js";

const nonEmptyText = Schema.String.check(Schema.isMinLength(1));

const criticIssueSchema = Schema.Struct({
  area: nonEmptyText,
  fix: nonEmptyText,
  problem: nonEmptyText,
  screen: Schema.optionalKey(Schema.String),
  severity: Schema.Literals(["high", "medium", "low"]),
  where: nonEmptyText,
});

type CriticIssue = typeof criticIssueSchema.Type;

const issueList = Schema.Array(criticIssueSchema);

const decodeIssueReply = toDecoder(
  Schema.Union([issueList, Schema.Struct({ issues: issueList })]),
  "ignore"
);

const toCriticIssues = (text: string): CriticIssue[] => {
  const reply = decodeIssueReply(extractJson(text));

  if (reply._tag === "Failure") {
    throw new Error("The critic reply is not valid.");
  }

  if ("issues" in reply.success) {
    return [...reply.success.issues];
  }

  return [...reply.success];
};

export { toCriticIssues };

export type { CriticIssue };
