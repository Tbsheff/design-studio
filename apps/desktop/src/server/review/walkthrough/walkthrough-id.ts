import { createHash } from "node:crypto";

interface IdInput {
  readonly canWrite: boolean;
  readonly directionId: string;
  readonly frameId: string;
  readonly maxSteps: number;
  readonly persona: string | null;
  readonly projectId: string;
  readonly task: string;
}

const ID_CHARS = 12;

const toWalkthroughId = (input: IdInput): string => {
  const digest = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")
    .slice(0, ID_CHARS);

  return `wt-${digest}`;
};

export { toWalkthroughId };

export type { IdInput };
