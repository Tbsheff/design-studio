import type { McpApprovalPoll } from "@design-studio/contracts/export";

import type { ConnectionState } from "./event-hub";
import { RADIX, SLICE_START } from "./stream-types";
import type { Wants } from "./stream-types";
import { VirtualSource } from "./virtual-source";

const applyState = (source: VirtualSource, state: ConnectionState): void => {
  if (state === "open") {
    source.open();
  }

  if (state === "reconnecting") {
    source.fail();
  }
};

class StreamTab {
  public readonly id =
    Math.random().toString(RADIX).slice(SLICE_START) +
    Date.now().toString(RADIX);
  public readonly sources = new Set<VirtualSource>();
  public state: ConnectionState = "connecting";
  public approvals: McpApprovalPoll | null = null;
  public readonly approvalListeners = new Set<
    (poll: McpApprovalPoll) => void
  >();
  private announcing = false;
  private readonly announce: (wants: Wants) => void;

  public constructor(announce: (wants: Wants) => void) {
    this.announce = announce;
  }

  public source(projectId: string, after: number): VirtualSource {
    const source = new VirtualSource(projectId, after, (closed) => {
      this.sources.delete(closed);
      this.changed();
    });

    this.sources.add(source);
    this.changed();

    if (this.state === "open") {
      queueMicrotask(() => {
        source.open();
      });
    }

    return source;
  }

  public wants(): Wants {
    const wants: Wants = {};

    for (const source of this.sources) {
      wants[source.projectId] = Math.min(
        wants[source.projectId] ?? Number.MAX_SAFE_INTEGER,
        source.delivered
      );
    }

    return wants;
  }

  public changed(): void {
    if (this.announcing) {
      return;
    }

    this.announcing = true;
    queueMicrotask(() => {
      this.announcing = false;
      this.announce(this.wants());
    });
  }

  public deliver(
    type: string,
    projectId: string,
    seq: number,
    data: string
  ): void {
    for (const source of this.sources) {
      if (source.projectId === projectId) {
        source.deliver(type, seq, data);
      }
    }
  }

  public setState(state: ConnectionState): void {
    if (this.state === state) {
      return;
    }

    this.state = state;

    for (const source of this.sources) {
      applyState(source, state);
    }
  }

  public setApprovals(poll: McpApprovalPoll): void {
    this.approvals = poll;

    for (const listener of this.approvalListeners) {
      listener(poll);
    }
  }
}

export { StreamTab };
