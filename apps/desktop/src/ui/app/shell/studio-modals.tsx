import type { Project } from "@design-studio/contracts";
import { Suspense } from "react";
import type { ReactElement } from "react";

import { DesignMdModal } from "../../features/design-system/index.js";
import { SettingsModal } from "./settings-modal";

interface StudioModalsProps {
  project: Project;
  designOpen: boolean;
  settingsOpen: boolean;
  onSaved: (project: Project) => void;
  onCloseDesign: () => void;
  onCloseSettings: () => void;
}

const StudioModals = (props: StudioModalsProps): ReactElement => (
  <>
    {props.designOpen && (
      <Suspense fallback={null}>
        <DesignMdModal
          projectId={props.project.id}
          onClose={props.onCloseDesign}
        />
      </Suspense>
    )}
    {props.settingsOpen && (
      <SettingsModal
        project={props.project}
        onSaved={props.onSaved}
        onClose={props.onCloseSettings}
      />
    )}
  </>
);

export { StudioModals };
