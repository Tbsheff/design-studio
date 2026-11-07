import type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";

import type { ToolInput } from "./tool-input.js";

type IntegrationGate = (
  toolName: string,
  toolUseId: string,
  input: ToolInput
) => Promise<PermissionResult>;

interface IntegrationPolicy {
  readonly allowed: readonly string[];
  readonly gate: IntegrationGate | null;
  readonly prefixes: readonly string[];
}

type IntegrationAccess = "allowed" | "ask";

const toIntegrationAccess = (
  policy: { readonly integrations?: IntegrationPolicy },
  toolName: string
): IntegrationAccess | null => {
  const found = policy.integrations ?? null;

  if (found === null) {
    return null;
  }

  if (!found.prefixes.some((prefix) => toolName.startsWith(prefix))) {
    return null;
  }

  if (found.allowed.includes(toolName)) {
    return "allowed";
  }

  return "ask";
};

const toIntegrationName = (
  policy: { readonly integrations?: IntegrationPolicy },
  toolName: string
): string | null => {
  const prefixes = policy.integrations?.prefixes ?? [];
  const prefix = prefixes.find((item) => toolName.startsWith(item)) ?? null;

  if (prefix === null) {
    return null;
  }

  return prefix.slice("mcp__".length, -"__".length);
};

export { toIntegrationAccess, toIntegrationName };

export type { IntegrationAccess, IntegrationGate, IntegrationPolicy };
