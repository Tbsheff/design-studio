import type { McpActivity } from "@design-studio/contracts";

interface ActivityDraft {
  projectId: string;
  directionId: string | null;
  summary: string;
  versionId?: string | null;
  beforeVersionId?: string | null;
  frameId?: string | null;
}

interface ActivityLog {
  record: (
    tool: string,
    client: string,
    draft: ActivityDraft
  ) => Promise<McpActivity>;
  list: (projectId: string) => Promise<McpActivity[]>;
  remap: (
    projectId: string,
    remapped: Record<string, { id: string; parentId: string }>
  ) => Promise<void>;
}

export type { ActivityDraft, ActivityLog };
