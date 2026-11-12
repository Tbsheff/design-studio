import type { WireOutput } from "@design-studio/actions/_core/action";
import type { getActivityStudio } from "@design-studio/actions/studio/get-activity";

import { copy } from "./copy.js";
import { toAgo } from "./workspace-model.js";

type ActivityWire = WireOutput<typeof getActivityStudio>;

type ActivityRunWire = ActivityWire["running"][number];

type ActivityApprovalWire = ActivityWire["approvals"][number];

type ActivityServerWire = ActivityWire["devServers"][number];

type RunTone = "running" | "ok" | "failed" | "off";

const CENTS = 100;
const PORT_PATTERN = /:(?<port>\d+)(?:\/|$)/u;
const LIVE_STATES = new Set(["ready", "starting"]);

const toCost = (costUsd: number | null): string | null => {
  if (costUsd === null || costUsd <= 0) {
    return null;
  }

  return `$${(Math.round(costUsd * CENTS) / CENTS).toFixed(2)}`;
};

const toRunSource = (run: ActivityRunWire): string => {
  if (run.source === "mcp") {
    return `${copy.mcpLabel} · ${run.client ?? copy.unknownClient}`;
  }

  return copy.chatLabel;
};

const toRunMeta = (run: ActivityRunWire, now: number): string => {
  const parts = [toRunSource(run)];

  if (!run.title.startsWith(run.projectName)) {
    parts.unshift(run.projectName);
  }

  const cost = toCost(run.costUsd);

  if (cost !== null) {
    parts.push(cost);
  }

  parts.push(toAgo(run.finishedAt ?? run.startedAt, now));

  return parts.join(" · ");
};

const toRunTone = (run: ActivityRunWire): RunTone => {
  if (run.status === "running") {
    return "running";
  }

  if (run.status === "completed") {
    return "ok";
  }

  if (run.status === "canceled") {
    return "off";
  }

  return "failed";
};

const toApprovalMeta = (approval: ActivityApprovalWire): string => {
  const place = approval.projectName ?? copy.allProjectsLower;

  return `${place} · ${copy.fromClient} ${approval.client}`;
};

const isServerLive = (server: ActivityServerWire): boolean =>
  LIVE_STATES.has(server.state);

const toPort = (url: string | null): string | null => {
  const match = url?.match(PORT_PATTERN) ?? null;

  return match?.groups?.port ?? null;
};

const toServerMeta = (server: ActivityServerWire): string => {
  if (!isServerLive(server)) {
    return server.state;
  }

  const port = toPort(server.url);

  if (port === null) {
    return server.state;
  }

  return `localhost:${port} · ${server.state}`;
};

const toMcpText = (activity: ActivityWire | null): string => {
  if (activity === null || !activity.mcp.isEnabled) {
    return copy.mcpOff;
  }

  const port = toPort(activity.mcp.url);

  if (!activity.mcp.isRunning || port === null) {
    return copy.mcpStopped;
  }

  return `${copy.mcpOn} :${port}`;
};

const toClientsWord = (count: number): string => {
  if (count === 1) {
    return copy.clientWord;
  }

  return copy.clientsWord;
};

const toClientsText = (activity: ActivityWire | null): string => {
  const clients = activity?.mcp.clients ?? [];

  if (clients.length === 0) {
    return copy.noClients;
  }

  const count = `${clients.length} ${toClientsWord(clients.length)}`;

  return `${count} · ${clients.join(", ")}`;
};

const toBranch = (
  activity: ActivityWire | null,
  folder: string | null
): string => {
  const found = activity?.branches.find((entry) => entry.folder === folder);

  return found?.branch ?? copy.noGit;
};

const toServerFor = (
  activity: ActivityWire | null,
  projectId: string | null
): ActivityServerWire | null =>
  activity?.devServers.find((server) => server.projectId === projectId) ?? null;

const isActivityEmpty = (
  activity: ActivityWire | null,
  hasError: boolean
): boolean => {
  if (hasError) {
    return false;
  }

  if (activity === null) {
    return false;
  }

  return (
    activity.running.length === 0 &&
    activity.approvals.length === 0 &&
    activity.recent.length === 0 &&
    activity.devServers.length === 0
  );
};

export {
  isActivityEmpty,
  isServerLive,
  toApprovalMeta,
  toBranch,
  toClientsText,
  toMcpText,
  toRunMeta,
  toRunTone,
  toServerFor,
  toServerMeta,
};

export type {
  ActivityApprovalWire,
  ActivityRunWire,
  ActivityServerWire,
  ActivityWire,
  RunTone,
};
