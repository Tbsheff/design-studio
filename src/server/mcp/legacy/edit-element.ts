import { applyDirectEdit } from "../../../shared/actions/direct-edit/apply.js";
import type {
  DirectEditResult,
  SelectionContext,
  SourceLoc,
} from "../../../shared/contracts.js";
import {
  chooseEditSite,
  siteRequest,
  textComesFromData,
} from "../../direct-edit/commit/edit-site.js";
import type {
  EditSite,
  EditSiteScope,
} from "../../direct-edit/commit/edit-site.js";
import { callAction } from "../action-call.js";
import { editSummary } from "../activity-text.js";
import { EditError, loadTarget, refuseWhileRunning } from "../edit-guards.js";
import type { EditDeps } from "../edit-guards.js";
import {
  hasClasses,
  ok,
  pageUrl,
  sourceElement,
  versionActivity,
} from "../edit-kit.js";
import type { Done } from "../edit-kit.js";
import { textHintsOf } from "../element.js";
import { editOutput } from "./direct-edit-result.js";
import type { EditElementInput } from "./direct-edit-schema.js";
import { structureElement } from "./structure-element.js";

type SourcedElement = SelectionContext & { source: SourceLoc };

type EditBody = ReturnType<typeof siteRequest> & {
  classes?: EditElementInput["classes"];
  hints?: ReturnType<typeof textHintsOf>;
  selector: string;
  style?: EditElementInput["style"];
  text?: string;
  variant?: string;
};

interface EditCall {
  deps: EditDeps;
  element: SourcedElement;
  input: EditElementInput;
  scope: EditSiteScope;
  site: EditSite;
  directionId: string;
  projectId: string;
}

const hasStyle = (input: EditElementInput): boolean =>
  Object.keys(input.style ?? {}).length > 0;

const isTextOnly = (input: EditElementInput): boolean =>
  (input.text ?? null) !== null && !hasClasses(input) && !hasStyle(input);

const editBody = (
  input: EditElementInput,
  element: SelectionContext,
  site: EditSite
): EditBody => {
  const body: EditBody = { ...siteRequest(site), selector: input.selector };

  if (input.style && hasStyle(input)) {
    body.style = input.style;
  }

  const text = input.text ?? null;

  if (text !== null) {
    body.text = text;
    body.hints = textHintsOf(element);
  }

  if (hasClasses(input)) {
    body.classes = input.classes;
  }

  if (input.variant) {
    body.variant = input.variant;
  }

  return body;
};

const retryOnComponent = async (
  call: EditCall,
  error: EditError
): Promise<DirectEditResult> => {
  const { site, element } = call;

  if (
    site.kind !== "use" ||
    site.explicit ||
    error.code !== "text_not_editable" ||
    !isTextOnly(call.input)
  ) {
    throw error;
  }

  const fromData = await textComesFromData(call.scope, element.source);

  if (!fromData) {
    throw error;
  }

  const component: EditSite = {
    explicit: false,
    kind: "component",
    shared: site.shared,
    source: element.source,
    tag: element.tag,
  };

  try {
    return await callAction<DirectEditResult>(call.deps, applyDirectEdit, {
      ...editBody(call.input, element, component),
      directionId: call.directionId,
      projectId: call.projectId,
    });
  } catch {
    throw error;
  }
};

const postEdit = async (call: EditCall): Promise<DirectEditResult> => {
  try {
    return await callAction<DirectEditResult>(call.deps, applyDirectEdit, {
      ...editBody(call.input, call.element, call.site),
      directionId: call.directionId,
      projectId: call.projectId,
    });
  } catch (error) {
    if (!(error instanceof EditError)) {
      throw error;
    }

    return retryOnComponent(call, error);
  }
};

const editElement = async (
  deps: EditDeps,
  input: EditElementInput
): Promise<Done> => {
  if (input.op) {
    return structureElement(deps, input, input.op);
  }

  const { project, direction } = await loadTarget(
    deps,
    input.projectId,
    input.directionId
  );

  refuseWhileRunning(deps, project, direction);

  const page = await pageUrl(deps, project, direction, input.path);

  const element = await sourceElement(deps, page, input.selector);

  const scope = { project, workTree: direction.workTree };

  const site = await chooseEditSite(scope, element, {
    classes: hasClasses(input) || hasStyle(input),
    selector: input.selector,
    target: input.target,
  });

  if ("error" in site) {
    throw new EditError(site.error);
  }

  const directionId = direction.id;
  const projectId = project.id;

  const result = await postEdit({
    deps,
    directionId,
    element,
    input,
    projectId,
    scope,
    site,
  });

  const summary = editSummary(
    element.tag,
    input.style,
    input.text,
    hasClasses(input)
  );

  return {
    activity: versionActivity(project, direction, summary, result.version),
    result: ok(editOutput(result, site)),
  };
};

export { editElement };
