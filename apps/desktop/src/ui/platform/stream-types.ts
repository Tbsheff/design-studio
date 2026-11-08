import type { McpApprovalPoll } from "@design-studio/contracts/export";

import type { ConnectionState } from "./event-hub";

type Wants = Record<string, number>;

type Wire =
  | { kind: "want"; tab: string; wants: Wants }
  | { kind: "bye"; tab: string }
  | { kind: "hello" }
  | {
      kind: "ev";
      type: string;
      pid: string;
      seq: number;
      data: string;
    }
  | { kind: "state"; state: ConnectionState }
  | { kind: "approvals"; poll: McpApprovalPoll };

const CHANNEL = "design-studio-stream";
const LEADER_LOCK = "design-studio-stream-leader";
const TAB_LOCK = "design-studio-tab-";
const REOPEN_MS = 2000;
const GAP_MS = 2000;
const GAP_MAX = 2000;
const RADIX = 36;
const SLICE_START = 2;

export {
  CHANNEL,
  GAP_MAX,
  GAP_MS,
  LEADER_LOCK,
  RADIX,
  REOPEN_MS,
  SLICE_START,
  TAB_LOCK,
};

export type { Wants, Wire };
