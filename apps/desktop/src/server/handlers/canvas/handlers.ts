// @generated
import type { CanvasActions } from "@design-studio/actions/canvas/index";

import type { Entries } from "../_core/handler.js";
import { handle as applyImplicitLinkCanvasHandle } from "./apply-implicit-link.js";
import { handle as createFlowCanvasHandle } from "./create-flow.js";
import { handle as createLinkCanvasHandle } from "./create-link.js";
import { handle as deleteLinkCanvasHandle } from "./delete-link.js";
import { handle as exportFlowCanvasHandle } from "./export-flow.js";
import { handle as getDocCanvasHandle } from "./get-doc.js";
import { handle as getFlowVideoCanvasHandle } from "./get-flow-video.js";
import { handle as inspectLinkInteractionCanvasHandle } from "./inspect-link-interaction.js";
import { handle as listFlowLinksCanvasHandle } from "./list-flow-links.js";
import { handle as listFlowParamsCanvasHandle } from "./list-flow-params.js";
import { handle as listFrameStatesCanvasHandle } from "./list-frame-states.js";
import { handle as listImplicitLinksCanvasHandle } from "./list-implicit-links.js";
import { handle as listLinksCanvasHandle } from "./list-links.js";
import { handle as setDocCanvasHandle } from "./set-doc.js";
import { handle as setFrameStateCanvasHandle } from "./set-frame-state.js";
import { handle as setLinkInteractionCanvasHandle } from "./set-link-interaction.js";
import { handle as setPresenceCanvasHandle } from "./set-presence.js";
import { handle as setStartLinkCanvasHandle } from "./set-start-link.js";
import { handle as updateFrameSessionCanvasHandle } from "./update-frame-session.js";
import { handle as updateLinkCanvasHandle } from "./update-link.js";

const CanvasEntries = {
  applyImplicitLinkCanvas: { handle: applyImplicitLinkCanvasHandle },
  createFlowCanvas: { handle: createFlowCanvasHandle },
  createLinkCanvas: { handle: createLinkCanvasHandle },
  deleteLinkCanvas: { handle: deleteLinkCanvasHandle },
  exportFlowCanvas: { handle: exportFlowCanvasHandle },
  getDocCanvas: { handle: getDocCanvasHandle },
  getFlowVideoCanvas: { handle: getFlowVideoCanvasHandle },
  inspectLinkInteractionCanvas: { handle: inspectLinkInteractionCanvasHandle },
  listFlowLinksCanvas: { handle: listFlowLinksCanvasHandle },
  listFlowParamsCanvas: { handle: listFlowParamsCanvasHandle },
  listFrameStatesCanvas: { handle: listFrameStatesCanvasHandle },
  listImplicitLinksCanvas: { handle: listImplicitLinksCanvasHandle },
  listLinksCanvas: { handle: listLinksCanvasHandle },
  setDocCanvas: { handle: setDocCanvasHandle },
  setFrameStateCanvas: { handle: setFrameStateCanvasHandle },
  setLinkInteractionCanvas: { handle: setLinkInteractionCanvasHandle },
  setPresenceCanvas: { handle: setPresenceCanvasHandle },
  setStartLinkCanvas: { handle: setStartLinkCanvasHandle },
  updateFrameSessionCanvas: { handle: updateFrameSessionCanvasHandle },
  updateLinkCanvas: { handle: updateLinkCanvasHandle },
} satisfies Entries<typeof CanvasActions>;

export { CanvasEntries };
