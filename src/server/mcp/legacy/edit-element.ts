import type {
  DirectEditResult,
  SelectionContext,
  SourceLoc,
} from "../../../shared/contracts.js";
import {
  chooseEditSite,
  editedAtLabel,
  locText,
  siteNote,
  siteRequest,
  textComesFromData,
} from "../../direct-edit/edit-site.js";
import type { EditSite, EditSiteScope } from "../../direct-edit/edit-site.js";
import { editSummary } from "../activity-text.js";
import {
  EditError,
  loadTarget,
  refuseWhileRunning,
  studioCall,
} from "../edit-deps.js";
import type { EditDeps } from "../edit-deps.js";
import {
  base,
  hasClasses,
  ok,
  pageUrl,
  sourceElement,
  versionActivity,
} from "../edit-kit.js";
import type { Done } from "../edit-kit.js";
import { textHintsOf } from "../element.js";
import type { EditElementInput } from "./direct-edit-schema.js";
import { structureElement } from "./structure-element.js";

type SourcedElement = SelectionContext & { source: SourceLoc };

type Tailwind = NonNullable<DirectEditResult["tailwind"]>;

type TextSource = NonNullable<DirectEditResult["textSource"]>;

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
  url: string;
}

interface EditOutput {
  applied: DirectEditResult["applied"];
  at: string;
  classes?: Tailwind["classes"];
  editedAt: ReturnType<typeof editedAtLabel>;
  file: string;
  note?: string;
  shared?: string;
  textSource?: string;
  title: string;
  use?: string;
  versionId: string;
  wrote?: Tailwind["mode"];
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
    return await studioCall<DirectEditResult>(
      call.deps,
      "POST",
      call.url,
      editBody(call.input, element, component)
    );
  } catch {
    throw error;
  }
};

const postEdit = async (call: EditCall): Promise<DirectEditResult> => {
  try {
    return await studioCall<DirectEditResult>(
      call.deps,
      "POST",
      call.url,
      editBody(call.input, call.element, call.site)
    );
  } catch (error) {
    if (!(error instanceof EditError)) {
      throw error;
    }

    return retryOnComponent(call, error);
  }
};

const editedAt = (result: DirectEditResult, site: EditSite): string => {
  if (result.textSource) {
    return `${result.textSource.file}:${result.textSource.line}`;
  }

  if (site.kind === "use" || result.file === site.source.file) {
    return locText(site.source);
  }

  return result.file;
};

const textSourceText = (info: TextSource): string => {
  const head = `Edited ${info.what} in ${info.file}:${info.line}.`;

  if (info.shared) {
    return `${head} ${info.shared}`;
  }

  return head;
};

const addSiteNote = (output: EditOutput, site: EditSite): void => {
  const note = siteNote(site);

  if (!note) {
    return;
  }

  if (site.kind === "use") {
    output.use = note;
  } else {
    output.shared = note;
  }
};

const addTailwind = (output: EditOutput, tailwind: Tailwind): void => {
  output.classes = tailwind.classes;
  output.wrote = tailwind.mode;

  if (tailwind.note) {
    output.note = tailwind.note;
  }
};

const editOutput = (result: DirectEditResult, site: EditSite): EditOutput => {
  const output: EditOutput = {
    applied: result.applied,
    at: editedAt(result, site),
    editedAt: editedAtLabel(site),
    file: result.file,
    title: result.version.title,
    versionId: result.version.id,
  };

  addSiteNote(output, site);

  if (result.tailwind) {
    addTailwind(output, result.tailwind);
  }

  if (result.textSource) {
    output.textSource = textSourceText(result.textSource);
  }

  return output;
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

  const url = `${base(project, direction.id)}/direct-edit`;

  const result = await postEdit({ deps, element, input, scope, site, url });

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
