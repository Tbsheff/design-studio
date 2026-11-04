import type {
  AppCandidate,
  AppFramework,
  AttachAppRequest,
  Direction,
  Project,
  ProjectKind,
  ProjectSettings,
  ProjectThumbnail,
} from "../../shared/contracts.js";
import type { ProjectStore } from "../types.js";

export interface DetectedApp {
  framework: AppFramework | null;
  appDir: string | null;
  candidates: AppCandidate[];
}

export interface AppDetection {
  cleanAppDir(raw: string): string | null;
  detectApp(root: string): Promise<DetectedApp>;
  frameworkOf(pkg: Record<string, unknown> | null): AppFramework | null;
  nextAppWorkspace(
    folder: string
  ): Promise<{ root: string; appDir: string } | null>;
}

export interface PackLookup {
  findTokenFile(workTree: string): Promise<string | null>;
}

export interface ProjectStorePorts {
  apps: AppDetection;
  packs: PackLookup;
}

export interface StudioProjectStore extends ProjectStore {
  directionOf(project: Project, directionId: string): Direction;
  mainDirection(project: Project): Direction;
  updateSettings(
    projectId: string,
    patch: Partial<ProjectSettings>
  ): Promise<Project>;
  setPackId(projectId: string, packId: string | null): Promise<Project>;
  markDesignSystemDeleted(projectId: string): Promise<Project>;
  createInFolder(input: {
    parentPath: string;
    name: string;
    kind: ProjectKind;
    settings?: Partial<ProjectSettings>;
    designSystemFor?: string;
  }): Promise<Project>;
  isHidden(project: Project): boolean;
  moveIntoFolder(projectId: string, parentPath: string): Promise<Project>;
  discardCreated(projectId: string): Promise<void>;
  rename(projectId: string, name: string): Promise<Project>;
  setThumbnail(projectId: string, thumbnail: ProjectThumbnail): Promise<void>;
  withLock<T>(projectId: string, task: () => Promise<T>): Promise<T>;
  linkModules(workTree: string, sourceModules: string): Promise<void>;
  reserveFolder(parentPath: string, name: string): Promise<string>;
  writeRaw(project: Project): Promise<void>;
  attachApp(input: AttachAppRequest): Promise<Project>;
}

export interface ImportOptions {
  appDir?: string;
  skipApp?: boolean;
}

export interface ProjectStoreOptions {
  templateDir?: string;
  installTemplateDeps?: (cacheDir: string) => Promise<void>;
}
