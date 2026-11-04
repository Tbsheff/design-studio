import { Schema } from "effect";

import { extractJson } from "../../shared/extract-json.js";

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

const decodeIssueReply = Schema.decodeUnknownResult(
  Schema.Union([issueList, Schema.Struct({ issues: issueList })])
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
