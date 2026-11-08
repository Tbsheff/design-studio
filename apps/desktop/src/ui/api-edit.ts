import { routes as textRoutes } from "@design-studio/actions/text/routes";
import type {
  SourceLoc,
  TextSourceAnswer,
  TextSourceHints,
  DirectEditRequest,
  DirectEditBatch,
  DirectEditBatchResult,
  StructureEditRequest,
  StructureEditResult,
  DirectEditResult,
  TailwindOutcome,
  ElementSourceInfo,
} from "@design-studio/contracts";
import type { IconList } from "@design-studio/contracts/icons";
import type { PageImportResult } from "@design-studio/contracts/page-import";
import type {
  StyleReplaceRequest,
  StyleReplaceResult,
} from "@design-studio/contracts/style-search";
import { TEXT_SEARCH_HITS_MAX } from "@design-studio/contracts/text-search";
import type {
  TextSearchQuery,
  TextSearchResult,
  TextUpdateRequest,
  TextUpdateResult,
} from "@design-studio/contracts/text-search";

import type { ArrangeRequest, ArrangeResult } from "../shared/arrange";
import type { VariantSupport } from "../shared/variants";
import { enc, json, toDirectionPath } from "./api-core.js";
import { editKind, timedEdit } from "./api-telemetry.js";
import type { EditTarget } from "./api-telemetry.js";
import { call, pickMessage, request } from "./platform/http";
import type { JsonBody } from "./platform/http";
import { insertIconAt, listIconsAt } from "./platform/icon-api";
import type {
  IconInsertBody,
  IconInsertReply,
  IconListQuery,
} from "./platform/icon-api";
import { importPageAt } from "./platform/page-api";
import type { PageImportBody } from "./platform/page-api";

interface SourcePoint {
  readonly col: number;
  readonly file: string;
  readonly line: number;
}

interface ElementClassesAnswer {
  readonly element: ElementSourceInfo | null;
  readonly tailwind: TailwindOutcome | null;
  readonly variants?: VariantSupport;
}

interface ElementSourceAnswer {
  readonly code: string | null;
  readonly file: string;
  readonly line: number;
}

const DIRECT_EDIT_COUNT = 1;

const postDirectEdit = async <Result>(
  target: EditTarget,
  body: JsonBody
): Promise<Result> => {
  const res = await request(
    "POST",
    `${toDirectionPath(target.projectId, target.directionId)}/direct-edit`,
    body,
    pickMessage
  );

  return (await res.json()) as Result;
};

const toVariantQuery = (variant: string): string => {
  if (variant === "") {
    return "";
  }

  return `&variant=${enc(variant)}`;
};

const toSourceQuery = (loc: SourcePoint): string =>
  `file=${enc(loc.file)}&line=${loc.line}&col=${loc.col}`;

const editApi = {
  directEdit: (
    pid: string,
    did: string,
    req: DirectEditRequest
  ): Promise<DirectEditResult> => {
    const target = { directionId: did, projectId: pid };

    return timedEdit(target, editKind(req), DIRECT_EDIT_COUNT, () =>
      postDirectEdit<DirectEditResult>(target, req)
    );
  },
  directEditBatch: (
    pid: string,
    did: string,
    batch: DirectEditBatch
  ): Promise<DirectEditBatchResult> => {
    const target = { directionId: did, projectId: pid };

    return timedEdit(target, "batch", batch.edits.length, () =>
      postDirectEdit<DirectEditBatchResult>(target, batch)
    );
  },
  elementClasses: (
    pid: string,
    did: string,
    loc: SourcePoint,
    variant = ""
  ): Promise<ElementClassesAnswer> =>
    json<ElementClassesAnswer>(
      "GET",
      `${toDirectionPath(pid, did)}/classes?${toSourceQuery(loc)}${toVariantQuery(variant)}`
    ),
  elementSource: (
    pid: string,
    did: string,
    loc: SourcePoint
  ): Promise<ElementSourceAnswer> =>
    json<ElementSourceAnswer>(
      "GET",
      `${toDirectionPath(pid, did)}/source?${toSourceQuery(loc)}`
    ),
  importPage: (
    pid: string,
    did: string,
    body: PageImportBody
  ): Promise<PageImportResult> => importPageAt(pid, did, body),
  insertIcon: (
    pid: string,
    did: string,
    body: IconInsertBody
  ): Promise<IconInsertReply> =>
    timedEdit(
      { directionId: did, projectId: pid },
      "icon",
      DIRECT_EDIT_COUNT,
      () => insertIconAt(pid, did, body)
    ),
  listIcons: (
    pid: string,
    did: string,
    query: IconListQuery
  ): Promise<IconList> => listIconsAt(pid, did, query),
  searchText: (
    pid: string,
    did: string,
    query: TextSearchQuery
  ): Promise<TextSearchResult> =>
    call(textRoutes.inspectText, {
      caseSensitive: query.caseSensitive,
      directionId: did,
      glob: query.glob,
      limit: TEXT_SEARCH_HITS_MAX,
      projectId: pid,
      query: query.query,
      regex: query.regex,
      wholeWord: query.wholeWord,
    }),
  structureEdit: (
    pid: string,
    did: string,
    req: StructureEditRequest
  ): Promise<StructureEditResult> => {
    const target = { directionId: did, projectId: pid };

    return timedEdit(target, req.op, req.targets.length, () =>
      postDirectEdit<StructureEditResult>(target, req)
    );
  },
  textSource: (
    pid: string,
    did: string,
    source: SourceLoc,
    hints: TextSourceHints
  ): Promise<TextSourceAnswer> =>
    json<TextSourceAnswer>("POST", `${toDirectionPath(pid, did)}/text-source`, {
      hints,
      source,
    }),
  updateText: (
    pid: string,
    did: string,
    req: TextUpdateRequest
  ): Promise<TextUpdateResult> =>
    call(textRoutes.updateText, {
      caseSensitive: req.caseSensitive,
      directionId: did,
      glob: req.glob,
      ids: req.ids,
      projectId: pid,
      query: req.query,
      regex: req.regex,
      replace: req.replace,
      wholeWord: req.wholeWord,
    }),
};

const replaceStyle = (
  pid: string,
  did: string,
  req: StyleReplaceRequest
): Promise<StyleReplaceResult> => {
  const target = { directionId: did, projectId: pid };

  return timedEdit(target, "replace-style", req.matches.length, () =>
    postDirectEdit<StyleReplaceResult>(target, { replaceStyle: req })
  );
};

const arrange = (
  projectId: string,
  directionId: string,
  req: ArrangeRequest
): Promise<ArrangeResult> => {
  const target = { directionId, projectId };

  return timedEdit(target, "arrange", req.targets.length, () =>
    postDirectEdit<ArrangeResult>(target, { arrange: req })
  );
};

export { arrange, editApi, replaceStyle };

export type { ElementClassesAnswer, ElementSourceAnswer, SourcePoint };
