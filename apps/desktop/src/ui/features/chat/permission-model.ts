import type { PermissionRequest } from "@design-studio/contracts";

import {
  RULE_MAX_CHARS,
  ruleForCommand,
} from "../../../shared/permissionRules.js";

interface BashInput {
  command?: string | null;
}

const toAlwaysRule = (request: PermissionRequest): string | null => {
  if (request.toolName !== "Bash") {
    return null;
  }

  const input = request.input as BashInput | null;
  const command = input?.command ?? "";
  const trimmed = command.trim();

  if (trimmed === "" || trimmed.length > RULE_MAX_CHARS) {
    return null;
  }

  return ruleForCommand(command);
};

export { toAlwaysRule };
