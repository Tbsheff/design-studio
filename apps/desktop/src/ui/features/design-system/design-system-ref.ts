import type { DesignSystemState, Project } from "@design-studio/contracts";

interface DesignSystemRef {
  backing: boolean;
  directionId: string | null;
  name: string | null;
  packId: string | null;
  projectId: string;
}

const designSystemRef = (
  projectId: string,
  directionId: string | null,
  project: Project,
  state: DesignSystemState | null
): DesignSystemRef => {
  const backing = Boolean(project.designSystemFor);

  const base = { backing, directionId, projectId };

  if (!state) {
    return { ...base, name: null, packId: project.packId ?? null };
  }

  return {
    ...base,
    name: state.manifest?.name ?? null,
    packId: state.packId,
  };
};

export { designSystemRef };

export type { DesignSystemRef };
