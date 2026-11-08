import type {
  DesignRulesState,
  DesignRulesTestResult,
} from "@design-studio/contracts/design-rules";

import { json, toDirectionPath } from "./api-core.js";

const rulesApi = {
  get: (pid: string, did: string): Promise<DesignRulesState> =>
    json<DesignRulesState>("GET", `${toDirectionPath(pid, did)}/rules`),
  save: (
    pid: string,
    did: string,
    text: string
  ): Promise<{ state: DesignRulesState; versionId: string | null }> =>
    json<{ state: DesignRulesState; versionId: string | null }>(
      "PUT",
      `${toDirectionPath(pid, did)}/rules`,
      { text }
    ),
  test: (
    pid: string,
    did: string,
    text: string,
    frame?: { frame: string; path?: string; width: number; height: number }
  ): Promise<DesignRulesTestResult> =>
    json<DesignRulesTestResult>(
      "POST",
      `${toDirectionPath(pid, did)}/rules/test`,
      {
        text,
        ...frame,
      }
    ),
};

export { rulesApi };
