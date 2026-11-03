// @generated
import { createLinkCanvas } from "./create-link.js";
import { deleteLinkCanvas } from "./delete-link.js";
import { keepLinkCanvas } from "./keep-link.js";
import { listImplicitLinksCanvas } from "./list-implicit-links.js";
import { listLinksCanvas } from "./list-links.js";
import { setStartLinkCanvas } from "./set-start-link.js";
import { updateLinkCanvas } from "./update-link.js";

const CanvasActions = {
  createLinkCanvas,
  deleteLinkCanvas,
  keepLinkCanvas,
  listImplicitLinksCanvas,
  listLinksCanvas,
  setStartLinkCanvas,
  updateLinkCanvas,
} as const;

export { CanvasActions };
