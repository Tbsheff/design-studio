// @generated
import type { CanvasActions } from "../../../shared/actions/canvas/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as createFlowCanvasHandle } from "./create-flow.js";
import { handle as createLinkCanvasHandle } from "./create-link.js";
import { handle as deleteLinkCanvasHandle } from "./delete-link.js";
import { handle as getDocCanvasHandle } from "./get-doc.js";
import { handle as importLinkCanvasHandle } from "./import-link.js";
import { handle as listFlowLinksCanvasHandle } from "./list-flow-links.js";
import { handle as listFlowParamsCanvasHandle } from "./list-flow-params.js";
import { handle as listFrameStatesCanvasHandle } from "./list-frame-states.js";
import { handle as listImplicitLinksCanvasHandle } from "./list-implicit-links.js";
import { handle as listLinksCanvasHandle } from "./list-links.js";
import { handle as setDocCanvasHandle } from "./set-doc.js";
import { handle as setFrameStateCanvasHandle } from "./set-frame-state.js";
import { handle as setPresenceCanvasHandle } from "./set-presence.js";
import { handle as setStartLinkCanvasHandle } from "./set-start-link.js";
import { handle as updateFrameSessionCanvasHandle } from "./update-frame-session.js";
import { handle as updateLinkCanvasHandle } from "./update-link.js";

const CanvasEntries = {
  createFlowCanvas: { handle: createFlowCanvasHandle },
  createLinkCanvas: { handle: createLinkCanvasHandle },
  deleteLinkCanvas: { handle: deleteLinkCanvasHandle },
  getDocCanvas: { handle: getDocCanvasHandle },
  importLinkCanvas: { handle: importLinkCanvasHandle },
  listFlowLinksCanvas: { handle: listFlowLinksCanvasHandle },
  listFlowParamsCanvas: { handle: listFlowParamsCanvasHandle },
  listFrameStatesCanvas: { handle: listFrameStatesCanvasHandle },
  listImplicitLinksCanvas: { handle: listImplicitLinksCanvasHandle },
  listLinksCanvas: { handle: listLinksCanvasHandle },
  setDocCanvas: { handle: setDocCanvasHandle },
  setFrameStateCanvas: { handle: setFrameStateCanvasHandle },
  setPresenceCanvas: { handle: setPresenceCanvasHandle },
  setStartLinkCanvas: { handle: setStartLinkCanvasHandle },
  updateFrameSessionCanvas: { handle: updateFrameSessionCanvasHandle },
  updateLinkCanvas: { handle: updateLinkCanvasHandle },
} satisfies Entries<typeof CanvasActions>;

export { CanvasEntries };
