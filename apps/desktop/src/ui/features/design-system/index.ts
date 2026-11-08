import { lazy } from "react";
import type { LazyExoticComponent } from "react";

import type { ComponentsPanel as ComponentsPanelView } from "./components-panel.js";
import type { CreateComponentDialog as CreateComponentDialogView } from "./create-component-dialog.js";
import type { DesignSystems as DesignSystemsView } from "./design-systems.js";
import type { NewDesignSystem as NewDesignSystemView } from "./new-design-system.js";

const ComponentsPanel: LazyExoticComponent<typeof ComponentsPanelView> = lazy(
  async () => {
    const loaded = await import("./components-panel.js");

    return { default: loaded.ComponentsPanel };
  }
);

const CreateComponentDialog: LazyExoticComponent<
  typeof CreateComponentDialogView
> = lazy(async () => {
  const loaded = await import("./create-component-dialog.js");

  return { default: loaded.CreateComponentDialog };
});

const DesignMdModal = lazy(async () => {
  const loaded = await import("./design-md-modal.js");

  return { default: loaded.DesignMdModal };
});

const DoctorCard = lazy(async () => {
  const loaded = await import("./doctor-card.js");

  return { default: loaded.DoctorCard };
});

const PortToAppDialog = lazy(async () => {
  const loaded = await import("./port-to-app-dialog.js");

  return { default: loaded.PortToAppDialog };
});

const loadDesignSystems = async (): Promise<typeof DesignSystemsView> => {
  const loaded = await import("./design-systems.js");

  return loaded.DesignSystems;
};

const loadNewDesignSystem = async (): Promise<typeof NewDesignSystemView> => {
  const loaded = await import("./new-design-system.js");

  return loaded.NewDesignSystem;
};

export {
  ComponentsPanel,
  CreateComponentDialog,
  DesignMdModal,
  DoctorCard,
  loadDesignSystems,
  loadNewDesignSystem,
  PortToAppDialog,
};

export { DesignSystemChip } from "./design-system-chip.js";

export { designSystemRef } from "./design-system-ref.js";

export { ChangePackDialog, SavePackDialog } from "./design-system-dialogs.js";

export { useComponents } from "./use-components.js";

export { useDesignSystemState } from "./use-design-system-state.js";

export { usePackActions } from "./use-pack-actions.js";

export type { DesignSystemRef } from "./design-system-ref.js";

export type { ComponentList } from "./use-components.js";

export type {
  DesignSystemView,
  DesignTokens,
} from "./use-design-system-state.js";

export type { Toast } from "./use-pack-actions.js";
