// @generated
import type { CanvasActions } from "../../../shared/actions/canvas/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as createLinkCanvasHandle } from "./create-link.js";
import { handle as deleteLinkCanvasHandle } from "./delete-link.js";
import { handle as keepLinkCanvasHandle } from "./keep-link.js";
import { handle as listImplicitLinksCanvasHandle } from "./list-implicit-links.js";
import { handle as listLinksCanvasHandle } from "./list-links.js";
import { handle as setStartLinkCanvasHandle } from "./set-start-link.js";
import { handle as updateLinkCanvasHandle } from "./update-link.js";

const CanvasEntries = {
  createLinkCanvas: { handle: createLinkCanvasHandle },
  deleteLinkCanvas: { handle: deleteLinkCanvasHandle },
  keepLinkCanvas: { handle: keepLinkCanvasHandle },
  listImplicitLinksCanvas: { handle: listImplicitLinksCanvasHandle },
  listLinksCanvas: { handle: listLinksCanvasHandle },
  setStartLinkCanvas: { handle: setStartLinkCanvasHandle },
  updateLinkCanvas: { handle: updateLinkCanvasHandle },
} satisfies Entries<typeof CanvasActions>;

export { CanvasEntries };
