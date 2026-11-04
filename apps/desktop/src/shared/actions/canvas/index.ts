// @generated
import { applyImplicitLinkCanvas } from "./apply-implicit-link.js";
import { createFlowCanvas } from "./create-flow.js";
import { createLinkCanvas } from "./create-link.js";
import { deleteLinkCanvas } from "./delete-link.js";
import { getDocCanvas } from "./get-doc.js";
import { listFlowLinksCanvas } from "./list-flow-links.js";
import { listFlowParamsCanvas } from "./list-flow-params.js";
import { listFrameStatesCanvas } from "./list-frame-states.js";
import { listImplicitLinksCanvas } from "./list-implicit-links.js";
import { listLinksCanvas } from "./list-links.js";
import { setDocCanvas } from "./set-doc.js";
import { setFrameStateCanvas } from "./set-frame-state.js";
import { setPresenceCanvas } from "./set-presence.js";
import { setStartLinkCanvas } from "./set-start-link.js";
import { updateFrameSessionCanvas } from "./update-frame-session.js";
import { updateLinkCanvas } from "./update-link.js";

const CanvasActions = {
  applyImplicitLinkCanvas,
  createFlowCanvas,
  createLinkCanvas,
  deleteLinkCanvas,
  getDocCanvas,
  listFlowLinksCanvas,
  listFlowParamsCanvas,
  listFrameStatesCanvas,
  listImplicitLinksCanvas,
  listLinksCanvas,
  setDocCanvas,
  setFrameStateCanvas,
  setPresenceCanvas,
  setStartLinkCanvas,
  updateFrameSessionCanvas,
  updateLinkCanvas,
} as const;

export { CanvasActions };
