import type { McpApprovalPoll } from "@design-studio/contracts/export";

import { APP_STREAM_PATH } from "../../shared/app-stream";
import type { StreamWatchRequest } from "../../shared/app-stream";
import type { EventSourceLike } from "./event-hub";
import { request } from "./http";
import { StreamLeader } from "./stream-leader";
import { StreamTab } from "./stream-tab";
import { CHANNEL, LEADER_LOCK, TAB_LOCK } from "./stream-types";
import type { Wire } from "./stream-types";

interface AppStream {
  source: (projectId: string, after: number) => EventSourceLike;
  onApprovals: (listener: (poll: McpApprovalPoll) => void) => () => void;
  onDone: (listener: (data: string) => void) => () => void;
}

interface FollowInput {
  readonly tab: StreamTab;
  readonly message: Wire;
  readonly leader: StreamLeader | null;
}

const followLeaderless = (tab: StreamTab, message: Wire): void => {
  switch (message.kind) {
    case "ev": {
      tab.deliver(message.type, message.pid, message.seq, message.data);

      break;
    }

    case "state": {
      tab.setState(message.state);

      break;
    }

    case "approvals": {
      tab.setApprovals(message.poll);

      break;
    }

    case "hello": {
      tab.changed();
      break;
    }

    case "done": {
      tab.done(message.data);

      break;
    }

    default: {
      break;
    }
  }
};

const followLeader = (leader: StreamLeader, message: Wire): void => {
  if (message.kind === "want") {
    leader.update(message.tab, message.wants);
  }

  if (message.kind === "bye") {
    leader.drop(message.tab);
  }
};

const follow = ({ leader, message, tab }: FollowInput): void => {
  if (leader) {
    followLeader(leader, message);

    return;
  }

  followLeaderless(tab, message);
};

const isSharedStreamSupported = (): boolean =>
  "BroadcastChannel" in globalThis &&
  "navigator" in globalThis &&
  Boolean(navigator.locks);

const holdLock = async (name: string, onAcquire: () => void): Promise<void> => {
  await navigator.locks.request(name, async () => {
    onAcquire();
    await Promise.withResolvers<null>().promise;
  });
};

const toApprovalsSubscriber =
  (tab: StreamTab): AppStream["onApprovals"] =>
  (listener) => {
    tab.approvalListeners.add(listener);

    if (tab.approvals) {
      listener(tab.approvals);
    }

    return () => {
      tab.approvalListeners.delete(listener);
    };
  };

const toDoneSubscriber =
  (tab: StreamTab): AppStream["onDone"] =>
  (listener) => {
    tab.doneListeners.add(listener);

    return () => {
      tab.doneListeners.delete(listener);
    };
  };

const sendWatch = async (
  sessionId: string,
  body: StreamWatchRequest
): Promise<void> => {
  await request(
    "POST",
    `${APP_STREAM_PATH}/${encodeURIComponent(sessionId)}`,
    body
  );
};

const openChannel = (): BroadcastChannel | null => {
  if (isSharedStreamSupported()) {
    return new BroadcastChannel(CHANNEL);
  }

  return null;
};

const startStream = (): AppStream => {
  const link = { channel: openChannel() };

  let leader: StreamLeader | null = null;

  const tab = new StreamTab((wants) => {
    if (leader) {
      leader.update(tab.id, wants);

      return;
    }

    const wire: Wire = { kind: "want", tab: tab.id, wants };

    link.channel?.postMessage(wire);
  });

  const lead = (): void => {
    leader = new StreamLeader({ channel: link.channel, sendWatch, tab });
    leader.start();
  };

  const { channel } = link;

  if (channel) {
    channel.addEventListener("message", (event: MessageEvent<Wire>) => {
      const message = event.data;
      follow({ leader, message, tab });
    });
    void holdLock(TAB_LOCK + tab.id, () => null);
    void holdLock(LEADER_LOCK, lead);
    globalThis.addEventListener("pagehide", () => {
      if (leader) {
        const state: Wire = { kind: "state", state: "reconnecting" };

        link.channel?.postMessage(state);

        return;
      }

      const bye: Wire = { kind: "bye", tab: tab.id };

      link.channel?.postMessage(bye);
    });
    tab.changed();
  } else {
    lead();
  }

  return {
    onApprovals: toApprovalsSubscriber(tab),
    onDone: toDoneSubscriber(tab),
    source: (projectId, after) => tab.source(projectId, after),
  };
};

let stream: AppStream | null = null;

const appStream = (): AppStream => {
  stream ??= startStream();

  return stream;
};

const subscribeActionDone = (
  listener: (data: string) => void
): (() => void) => {
  if (!("EventSource" in globalThis)) {
    return () => false;
  }

  return appStream().onDone(listener);
};

export { appStream, subscribeActionDone };
