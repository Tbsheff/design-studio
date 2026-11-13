// @generated
import { applyImplicitLinkCanvas } from "./apply-implicit-link.js";
import { createFlowCanvas } from "./create-flow.js";
import { createFrameCanvas } from "./create-frame.js";
import { createLinkCanvas } from "./create-link.js";
import { createLinkedFrameCanvas } from "./create-linked-frame.js";
import { createRouteFrameCanvas } from "./create-route-frame.js";
import { createStateFramesCanvas } from "./create-state-frames.js";
import { deleteFrameCanvas } from "./delete-frame.js";
import { deleteFramesCanvas } from "./delete-frames.js";
import { deleteLinkCanvas } from "./delete-link.js";
import { deleteSectionCanvas } from "./delete-section.js";
import { exportFlowCanvas } from "./export-flow.js";
import { getDocCanvas } from "./get-doc.js";
import { getFlowVideoCanvas } from "./get-flow-video.js";
import { importFrameCanvas } from "./import-frame.js";
import { inspectLinkInteractionCanvas } from "./inspect-link-interaction.js";
import { inspectStateFramesCanvas } from "./inspect-state-frames.js";
import { inspectCanvas } from "./inspect.js";
import { listFlowLinksCanvas } from "./list-flow-links.js";
import { listFlowParamsCanvas } from "./list-flow-params.js";
import { listFrameStatesCanvas } from "./list-frame-states.js";
import { listImplicitLinksCanvas } from "./list-implicit-links.js";
import { listLinksCanvas } from "./list-links.js";
import { moveFramesCanvas } from "./move-frames.js";
import { setDocCanvas } from "./set-doc.js";
import { setFrameStateCanvas } from "./set-frame-state.js";
import { setLinkInteractionCanvas } from "./set-link-interaction.js";
import { setPointCanvas } from "./set-point.js";
import { setPresenceCanvas } from "./set-presence.js";
import { setSectionCanvas } from "./set-section.js";
import { setStartLinkCanvas } from "./set-start-link.js";
import { setStartPointsCanvas } from "./set-start-points.js";
import { updateFrameSessionCanvas } from "./update-frame-session.js";
import { updateFrameCanvas } from "./update-frame.js";
import { updateLinkCanvas } from "./update-link.js";

const CanvasActions = {
  applyImplicitLinkCanvas,
  createFlowCanvas,
  createFrameCanvas,
  createLinkCanvas,
  createLinkedFrameCanvas,
  createRouteFrameCanvas,
  createStateFramesCanvas,
  deleteFrameCanvas,
  deleteFramesCanvas,
  deleteLinkCanvas,
  deleteSectionCanvas,
  exportFlowCanvas,
  getDocCanvas,
  getFlowVideoCanvas,
  importFrameCanvas,
  inspectCanvas,
  inspectLinkInteractionCanvas,
  inspectStateFramesCanvas,
  listFlowLinksCanvas,
  listFlowParamsCanvas,
  listFrameStatesCanvas,
  listImplicitLinksCanvas,
  listLinksCanvas,
  moveFramesCanvas,
  setDocCanvas,
  setFrameStateCanvas,
  setLinkInteractionCanvas,
  setPointCanvas,
  setPresenceCanvas,
  setSectionCanvas,
  setStartLinkCanvas,
  setStartPointsCanvas,
  updateFrameCanvas,
  updateFrameSessionCanvas,
  updateLinkCanvas,
} as const;

export { CanvasActions };
