import type { McpApprovalPoll } from "@design-studio/contracts/export";

import { APP_STREAM_PATH } from "../../shared/app-stream";
import type { StreamWatchRequest } from "../../shared/app-stream";
import type { EventSourceLike } from "./event-hub";
import { request } from "./http";
import { getSession } from "./session";
import { StreamLeader } from "./stream-leader";
import { StreamTab } from "./stream-tab";
import { CHANNEL, LEADER_LOCK, TAB_LOCK } from "./stream-types";
import type { Wire } from "./stream-types";

interface AppStream {
  source: (projectId: string, after: number) => EventSourceLike;
  onApprovals: (listener: (poll: McpApprovalPoll) => void) => () => void;
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
    await new Promise<void>(() => null);
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

const startStream = (): AppStream => {
  const channel = isSharedStreamSupported()
    ? new BroadcastChannel(CHANNEL)
    : null;

  let leader: StreamLeader | null = null;

  const tab = new StreamTab((wants) => {
    if (leader) {
      leader.update(tab.id, wants);

      return;
    }

    channel?.postMessage({ kind: "want", tab: tab.id, wants } satisfies Wire);
  });

  const lead = (): void => {
    leader = new StreamLeader({ channel, sendWatch, tab });
    leader.start();
  };

  if (channel) {
    channel.addEventListener("message", (event: MessageEvent<Wire>) => {
      const message = event.data;
      follow({ leader, message, tab });
    });
    void holdLock(TAB_LOCK + tab.id, () => null);
    void holdLock(LEADER_LOCK, lead);
    globalThis.addEventListener("pagehide", () => {
      if (leader) {
        channel.postMessage({
          kind: "state",
          state: "reconnecting",
        } satisfies Wire);

        return;
      }

      channel.postMessage({ kind: "bye", tab: tab.id } satisfies Wire);
    });
    tab.changed();
  } else {
    lead();
  }

  return {
    onApprovals: toApprovalsSubscriber(tab),
    source: (projectId, after) => tab.source(projectId, after),
  };
};

let stream: AppStream | null = null;

const appStream = (): AppStream => {
  stream ??= startStream();

  return stream;
};

const ACTION_DONE_EVENT = "action.done";

const subscribeActionDone = (
  listener: (data: string) => void
): (() => void) => {
  if (!("EventSource" in globalThis)) {
    return () => false;
  }

  const url = `${APP_STREAM_PATH}?token=${encodeURIComponent(getSession().token)}`;
  const source = new EventSource(url);
  source.addEventListener(ACTION_DONE_EVENT, (event) => {
    listener((event as MessageEvent<string>).data);
  });

  return () => {
    source.close();
  };
};

export { appStream, subscribeActionDone };
