import { copy } from "./copy.js";
import type { RouteInput, RouteOutput, integrationRoutes } from "./deps.js";

type IntegrationItem = RouteOutput<
  typeof integrationRoutes.listIntegration
>["items"][number];

type IntegrationCreateInput = RouteInput<
  typeof integrationRoutes.createIntegration
>;

type IntegrationTransport = IntegrationItem["transport"];

interface IntegrationDraft {
  readonly args: string;
  readonly command: string;
  readonly name: string;
  readonly secret: string;
  readonly secretName: string;
  readonly transport: IntegrationTransport;
  readonly url: string;
}

const NAME_PATTERN = /^[a-z][a-z0-9_]{0,31}$/u;

const EMPTY_DRAFT: IntegrationDraft = {
  args: "",
  command: "",
  name: "",
  secret: "",
  secretName: "",
  transport: "stdio",
  url: "",
};

const toAllowed = (tools: readonly string[] | null): string[] | null => {
  if (tools === null) {
    return null;
  }

  return [...tools];
};

const toKept = (text: string): string | null => {
  const trimmed = text.trim();

  if (trimmed === "") {
    return null;
  }

  return trimmed;
};

const isNameValid = (name: string): boolean =>
  NAME_PATTERN.test(name) && !name.includes("__");

const isDraftReady = (draft: IntegrationDraft): boolean => {
  if (!isNameValid(draft.name)) {
    return false;
  }

  if (draft.transport === "http") {
    return /^https?:\/\/\S+$/u.test(draft.url.trim());
  }

  return draft.command.trim() !== "";
};

const toArgs = (text: string): string[] =>
  text.split(/\s+/u).filter((part) => part !== "");

const toCreateInput = (draft: IntegrationDraft): IntegrationCreateInput => ({
  args: toArgs(draft.args),
  command: toKept(draft.command),
  name: draft.name,
  secret: toKept(draft.secret),
  secretName: toKept(draft.secretName),
  transport: draft.transport,
  url: toKept(draft.url),
});

const toToolCount = (item: IntegrationItem): number => item.tools.length;

type IntegrationUpdateInput = RouteInput<
  typeof integrationRoutes.updateIntegration
>;

interface IntegrationPatch {
  readonly allowedTools: readonly string[] | null;
  readonly isEnabled: boolean | null;
}

const toUpdateInput = (
  id: string,
  patch: IntegrationPatch
): IntegrationUpdateInput => ({
  allowedTools: toAllowed(patch.allowedTools),
  args: null,
  command: null,
  integrationId: id,
  isEnabled: patch.isEnabled,
  secret: null,
  secretName: null,
  url: null,
});

const toStatusText = (item: IntegrationItem): string => {
  if (item.status === "connected") {
    return copy.statusConnected;
  }

  if (item.status === "error") {
    return copy.statusError;
  }

  return copy.statusUntested;
};

export {
  EMPTY_DRAFT,
  isDraftReady,
  isNameValid,
  toCreateInput,
  toStatusText,
  toToolCount,
  toUpdateInput,
};

export type {
  IntegrationDraft,
  IntegrationItem,
  IntegrationPatch,
  IntegrationTransport,
  IntegrationUpdateInput,
};
