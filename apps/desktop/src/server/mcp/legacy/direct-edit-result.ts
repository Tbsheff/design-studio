import type {
  DirectEditResult,
  StructureEditResult,
  Version,
} from "@design-studio/contracts";

import {
  editedAtLabel,
  locText,
  siteNote,
} from "../../direct-edit/commit/index.js";
import type { EditSite } from "../../direct-edit/commit/index.js";

type Tailwind = NonNullable<DirectEditResult["tailwind"]>;

type TextSource = NonNullable<DirectEditResult["textSource"]>;

interface UnchangedResult {
  changed: false;
  path: string;
  versionId: string | null;
}

interface WrittenResult {
  changed: true;
  created: boolean;
  path: string;
  title: string | null;
  versionId: string | null;
}

interface StructureResult {
  files: StructureEditResult["files"];
  select: StructureEditResult["select"];
  title: string;
  versionId: string;
}

interface SiteNoteField {
  shared?: string;
  use?: string;
}

interface TailwindFields {
  classes?: Tailwind["classes"];
  note?: string;
  wrote?: Tailwind["mode"];
}

interface TextSourceField {
  textSource?: string;
}

type EditOutput = SiteNoteField &
  TailwindFields &
  TextSourceField & {
    applied: DirectEditResult["applied"];
    at: string;
    editedAt: ReturnType<typeof editedAtLabel>;
    file: string;
    title: string;
    versionId: string;
  };

const unchangedResult = (
  relative: string,
  head: string | null
): UnchangedResult => ({
  changed: false,
  path: relative,
  versionId: head,
});

const writtenResult = (
  relative: string,
  isNew: boolean,
  version: Version | null
): WrittenResult => ({
  changed: true,
  created: isNew,
  path: relative,
  title: version?.title ?? null,
  versionId: version?.id ?? null,
});

const structureResult = (view: StructureEditResult): StructureResult => ({
  files: view.files,
  select: view.select,
  title: view.version.title,
  versionId: view.version.id,
});

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

const siteNoteField = (site: EditSite): SiteNoteField => {
  const note = siteNote(site);

  if (!note) {
    return {};
  }

  if (site.kind === "use") {
    return { use: note };
  }

  return { shared: note };
};

const tailwindFields = (
  tailwind: Tailwind | null | undefined
): TailwindFields => {
  if (!tailwind) {
    return {};
  }

  if (tailwind.note) {
    return {
      classes: tailwind.classes,
      note: tailwind.note,
      wrote: tailwind.mode,
    };
  }

  return { classes: tailwind.classes, wrote: tailwind.mode };
};

const textSourceField = (
  info: TextSource | null | undefined
): TextSourceField => {
  if (info) {
    return { textSource: textSourceText(info) };
  }

  return {};
};

const editOutput = (result: DirectEditResult, site: EditSite): EditOutput => ({
  at: editedAt(result, site),
  editedAt: editedAtLabel(site),
  file: result.file,
  ...siteNoteField(site),
  applied: result.applied,
  title: result.version.title,
  versionId: result.version.id,
  ...tailwindFields(result.tailwind),
  ...textSourceField(result.textSource),
});

export { editOutput, structureResult, unchangedResult, writtenResult };
