export { commitDirectEdit } from "./apply.js";

export { planDirectEdit } from "./edit-plan.js";

export {
  patchSource,
  resolveSource,
  themeForFile,
  writeAtomic,
  writeNewFile,
} from "./edit-source.js";

export { editSummary } from "./edit-title.js";

export type {
  DirectEditDeps,
  EditFileChange,
  EditRecord,
  EditRecorder,
  EditScope,
  PlannedEdit,
  ResolvedSource,
} from "./edit-types.js";

export {
  announceWhile,
  assertCanEdit,
  publishVersion,
  saveDeferred,
} from "./publish.js";

export {
  ARRANGE_TARGETS_MAX,
  DEFAULT_ARRANGE_VIEWPORT,
  measureTargets,
  planArrange,
} from "./arrange.js";

export { applyDirectEditBatch, writeAndCommitAll } from "./batch.js";

export type { WrittenFile } from "./batch.js";

export { elementClassInfo } from "./class-info.js";

export {
  EDIT_TARGETS,
  chooseEditSite,
  editedAtLabel,
  locText,
  siteNote,
  siteRequest,
  textComesFromData,
} from "./edit-site.js";

export type { EditSite, EditSiteScope } from "./edit-site.js";

export { followSourceMoves } from "./follow-moves.js";

export { createEditHistory } from "./history.js";

export type { EditHistory, EditStepResult, HistoryStep } from "./history.js";

export { revertHunk } from "./hunk-revert.js";

export {
  parseSetImage,
  planChanged,
  planSetImage,
  writeImagePlan,
} from "./image.js";

export type { ImagePlan } from "./image.js";

export {
  jsxElementAt,
  jsxTagName,
  setHtmlAttrs,
  setJsxAttrs,
} from "./image-attrs.js";

export type { AttrChanges } from "./image-attrs.js";

export { imageFromPath, imageFromUrl, sniffImage } from "./image-source.js";

export type { ImageBytes } from "./image-source.js";

export { planClearText, planInsertJsx } from "./jsx-insert.js";

export type { JsxInsertPlan } from "./jsx-insert.js";

export { parseSetProps, planSetProps } from "./props.js";

export { planStyleReplace } from "./replace.js";

export { recordRunInHistory } from "./run-record.js";

export {
  PENDING_VERSION,
  savedVersionId,
  savesSettled,
  takeSaveFailures,
  withSaveQueue,
} from "./save-queue.js";

export { planStructureEdit } from "./structure-apply.js";

export {
  scanPageStyles,
  styleReport,
  tokenEntriesFor,
  tokenLookupFor,
} from "./style-scan.js";

export { findTextSource } from "./text-source.js";

export { walkNodes } from "./text-source-files.js";

export { planVector } from "./vector-ops.js";
