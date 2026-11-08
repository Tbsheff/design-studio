import type { Direction, Project } from "@design-studio/contracts";

import type { ScreenLayout } from "./engine/index.js";

interface InspectScope {
  readonly direction: Direction;
  readonly project: Project;
}

interface ScreenScope extends InspectScope {
  readonly projectDir: string;
}

interface LayoutGroupInfo {
  readonly isAuthRequired: boolean;
  readonly layoutFile: string | null;
  readonly name: string;
  readonly sampleRoutes: readonly string[];
  readonly shellComponents: readonly string[];
}

interface ScreenPlan {
  readonly filePath: string;
  readonly groups: readonly LayoutGroupInfo[];
  readonly isPathFree: boolean;
}

interface InspectScreenCommand extends InspectScope {
  readonly cursor: string | null;
  readonly limit: number;
  readonly path: string;
}

interface InspectScreenPage {
  readonly filePath: string;
  readonly groups: {
    readonly items: readonly LayoutGroupInfo[];
    readonly next: string | null;
  };
  readonly isPathFree: boolean;
}

interface CreateScreenCommand {
  readonly directionId: string;
  readonly group: string | null;
  readonly layout: ScreenLayout;
  readonly path: string;
  readonly projectId: string;
  readonly title: string;
}

interface DuplicateScreenCommand {
  readonly directionId: string;
  readonly from: string;
  readonly path: string;
  readonly projectId: string;
}

interface PlannedFile {
  readonly code: string;
  readonly relative: string;
}

interface ScreenWritePlan {
  readonly files: readonly PlannedFile[];
  readonly framePath: string;
  readonly label: string;
  readonly rightOfPath: string | null;
  readonly rollbackRoot: string | null;
  readonly route: string;
  readonly versionTitle: string;
}

interface ScreenCreated {
  readonly filePath: string;
  readonly frameId: string;
  readonly route: string;
  readonly versionId: string | null;
}

interface ScreenDuplicated {
  readonly files: readonly string[];
  readonly frameId: string;
  readonly route: string;
  readonly versionId: string | null;
}

const HTML_GROUP = "pages";

const ROOT_GROUP = "(root)";

export { HTML_GROUP, ROOT_GROUP };

export type {
  CreateScreenCommand,
  DuplicateScreenCommand,
  InspectScope,
  InspectScreenCommand,
  InspectScreenPage,
  LayoutGroupInfo,
  PlannedFile,
  ScreenCreated,
  ScreenDuplicated,
  ScreenPlan,
  ScreenScope,
  ScreenWritePlan,
};
