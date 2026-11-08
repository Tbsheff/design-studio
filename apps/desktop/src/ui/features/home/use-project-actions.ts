import type { Project } from "@design-studio/contracts";
import { shortenHome } from "@design-studio/contracts/folders";

import { errorText } from "../../api.js";
import type { HomeToastState } from "./home-toast-model.js";
import type { CardActions } from "./project-card-model.js";
import { projectsApi } from "./projects-store-model.js";

interface ActionDeps {
  readonly onOpen: (project: Project) => void;
  readonly showToast: (toast: Omit<HomeToastState, "id">) => void;
  readonly onOpenTrash: () => void;
  readonly homeDir: string | null;
}

const getRemovedText = (project: Project, homeDir: string | null): string => {
  const folder = project.imported?.sourcePath;

  if (!folder || project.imported?.created) {
    return `Moved “${project.name}” to Trash`;
  }

  return `Removed “${project.name}” from Design Studio. Its files stay in ${shortenHome(folder.replace(/^\/private(?=\/)/u, ""), homeDir)}.`;
};

const useProjectActions = ({
  onOpen: openProject,
  showToast,
  onOpenTrash,
  homeDir,
}: ActionDeps): CardActions => ({
  onDelete: async (project) => {
    try {
      const trashed = await projectsApi.trash(project);

      const undo = async (): Promise<void> => {
        try {
          await projectsApi.restore(trashed.trashId);
        } catch (error: unknown) {
          showToast({
            hasError: true,
            text: `Could not restore: ${errorText(error)}`,
          });
        }
      };

      showToast({
        action: { label: "Undo", run: undo },
        hasError: false,
        more: { label: "Open Trash", run: onOpenTrash },
        text: getRemovedText(project, homeDir),
      });
    } catch (error) {
      showToast({
        hasError: true,
        text: `Could not move to Trash: ${errorText(error)}`,
      });
    }
  },
  onDuplicate: async (project) => {
    try {
      const duplicate = await projectsApi.duplicate(project);
      showToast({
        action: { label: "Open", run: () => openProject(duplicate) },
        hasError: false,
        text: `Duplicated as “${duplicate.name}”`,
      });
    } catch (error) {
      showToast({
        hasError: true,
        text: `Could not duplicate: ${errorText(error)}`,
      });
    }
  },
  onOpen: openProject,
  onRename: async (project, name) => {
    try {
      await projectsApi.rename(project, name);
    } catch (error: unknown) {
      showToast({
        hasError: true,
        text: `Could not rename: ${errorText(error)}`,
      });
    }
  },
  onReveal: async (project) => {
    try {
      await projectsApi.reveal(project);
    } catch (error: unknown) {
      showToast({
        hasError: true,
        text: `Could not show the folder: ${errorText(error)}`,
      });
    }
  },
});

export { useProjectActions };
