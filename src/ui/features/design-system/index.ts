import { lazy } from "react";

const ComponentsPanel = lazy(async () => {
  const loaded = await import("./components-panel.js");

  return { default: loaded.ComponentsPanel };
});

const CreateComponentDialog = lazy(async () => {
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

export {
  ComponentsPanel,
  CreateComponentDialog,
  DesignMdModal,
  DoctorCard,
  PortToAppDialog,
};

export { DesignSystemChip } from "./design-system-chip.js";

export { ChangePackDialog, SavePackDialog } from "./design-system-dialogs.js";
