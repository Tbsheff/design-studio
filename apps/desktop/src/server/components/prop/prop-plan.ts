import { BadRequestError, ConflictError, parseModuleFile } from "./deps.js";
import {
  applySplices,
  hasChildren,
  hasSpread,
  listProps,
  createLayerPlan,
  createDeletePlan,
  createRenamePlan,
  getComponentModel,
  toAttribute,
  toLine,
  toRemoveSplice,
  toRenameSplice,
} from "./engine/index.js";
import type { MakeKind, PropKind, PropRow, Splice } from "./engine/index.js";
import { listSites } from "./prop-sites.js";
import type { SiteFile } from "./prop-sites.js";
import { getTarget, toErrorCount, toThrown } from "./prop-target.js";
import type { PropScope, PropTarget, TargetCommand } from "./prop-target.js";

interface FileChange {
  readonly after: string;
  readonly before: string;
  readonly relative: string;
}

interface CallSite {
  readonly file: string;
  readonly line: number;
}

interface PropWork {
  readonly callSites: readonly CallSite[];
  readonly changes: readonly FileChange[];
  readonly component: string;
  readonly default: string | null;
  readonly kind: PropKind;
  readonly name: string;
  readonly newName: string | null;
  readonly note: string | null;
  readonly title: string;
}

interface CreateCommand extends TargetCommand {
  readonly kind: MakeKind;
  readonly layerCol: number;
  readonly layerLine: number;
  readonly name: string;
}

interface RenameCommand extends TargetCommand {
  readonly name: string;
  readonly newName: string;
}

interface DeleteCommand extends TargetCommand {
  readonly name: string;
}

interface ListedProp extends PropRow {
  readonly useCount: number;
}

interface FileEdit {
  readonly code: string;
  readonly relative: string;
  readonly splices: Splice[];
}

type Attribute = NonNullable<ReturnType<typeof toAttribute>>;

const SEEN_NOTE =
  "Use sites that import the component under another name than its export are not seen.";

const toCount = (sites: readonly SiteFile[], name: string): number => {
  let count = 0;

  for (const site of sites) {
    for (const element of site.elements) {
      if (
        toAttribute(element, name) !== null ||
        (name === "children" && hasChildren(element))
      ) {
        count += 1;
      }
    }
  }

  return count;
};

const inspectUncertain = (
  sites: readonly SiteFile[],
  target: PropTarget
): void => {
  const stray = sites.find((site) => site.strays > 0);

  if (stray) {
    throw new BadRequestError(
      `${stray.relative} uses ${target.model.name} in a way that is not a JSX tag, so that use site cannot be edited.`
    );
  }

  const spread = sites.find((site) =>
    site.elements.some((element) => hasSpread(element))
  );

  if (spread) {
    throw new BadRequestError(
      `A use site in ${spread.relative} spreads props into ${target.model.name}, so it may set the prop. That use site cannot be edited.`
    );
  }
};

const toChange = (edit: FileEdit): FileChange => {
  const applied = applySplices(edit.code, edit.splices);

  if (!applied.ok) {
    throw toThrown(applied);
  }

  if (
    toErrorCount(applied.value, edit.relative) >
    toErrorCount(edit.code, edit.relative)
  ) {
    throw new BadRequestError(
      `The change would leave ${edit.relative} with a syntax error. Nothing was written.`
    );
  }

  return { after: applied.value, before: edit.code, relative: edit.relative };
};

const toEdits = (
  target: PropTarget,
  own: readonly Splice[],
  sites: readonly FileEdit[]
): FileEdit[] => {
  const first: FileEdit = {
    code: target.model.code,
    relative: target.relative,
    splices: [...own],
  };

  const edits = new Map<string, FileEdit>([[target.relative, first]]);

  for (const site of sites) {
    const known = edits.get(site.relative);

    if (known) {
      known.splices.push(...site.splices);
    } else {
      edits.set(site.relative, site);
    }
  }

  return [...edits.values()];
};

interface SiteEdits {
  readonly callSites: CallSite[];
  readonly edits: FileEdit[];
}

interface SiteSplices {
  readonly callSites: CallSite[];
  readonly splices: Splice[];
}

const toSiteSplices = (
  site: SiteFile,
  name: string,
  edit: (attribute: Attribute, site: SiteFile) => Splice
): SiteSplices => {
  const callSites: CallSite[] = [];
  const splices: Splice[] = [];

  for (const element of site.elements) {
    const attribute = toAttribute(element, name);

    if (attribute !== null) {
      callSites.push({ file: site.relative, line: toLine(element) });
      splices.push(edit(attribute, site));
    }
  }

  return { callSites, splices };
};

const toSiteEdits = (
  sites: readonly SiteFile[],
  name: string,
  edit: (attribute: Attribute, site: SiteFile) => Splice
): SiteEdits => {
  const callSites: CallSite[] = [];
  const edits: FileEdit[] = [];

  for (const site of sites) {
    const found = toSiteSplices(site, name, edit);

    callSites.push(...found.callSites);

    if (found.splices.length > 0) {
      edits.push({
        code: site.code,
        relative: site.relative,
        splices: found.splices,
      });
    }
  }

  return { callSites, edits };
};

const toChanges = (edits: readonly FileEdit[]): FileChange[] =>
  edits.map((edit) => toChange(edit));

const inspectProps = (
  target: PropTarget,
  change: FileChange | null,
  check: (names: ReadonlySet<string>) => string | null
): void => {
  const { name } = target.model;
  const ast = change && parseModuleFile(change.after, target.file);

  if (!change || !ast) {
    throw new BadRequestError(
      "The changed component can no longer be read. Nothing was written."
    );
  }

  const reread = getComponentModel(change.after, ast, name, target.relative);

  if (!reread.ok) {
    throw new BadRequestError(
      "The changed component can no longer be read. Nothing was written."
    );
  }

  const names = new Set(reread.value.entries.map((item) => item.name));
  const problem = check(names);

  if (problem !== null) {
    throw new BadRequestError(`${problem} Nothing was written.`);
  }
};

interface WorkParts {
  readonly callSites: readonly CallSite[];
  readonly changes: readonly FileChange[];
  readonly default: string | null;
  readonly kind: PropKind;
  readonly name: string;
  readonly newName: string | null;
  readonly title: string;
}

const toWork = (target: PropTarget, parts: WorkParts): PropWork => ({
  ...parts,
  component: target.model.name,
  note: SEEN_NOTE,
});

const getCreateWork = async (
  scope: PropScope,
  command: CreateCommand
): Promise<PropWork> => {
  const target = await getTarget(scope, command);

  const planned = createLayerPlan(target.model, {
    col: command.layerCol,
    kind: command.kind,
    line: command.layerLine,
    name: command.name,
  });

  if (!planned.ok) {
    throw toThrown(planned);
  }

  const sites = await listSites(target);
  const used = toCount(sites, command.name);

  if (used > 0) {
    throw new ConflictError(
      `${used} use sites of ${target.model.name} already pass ${command.name}. A new prop with that name would change them.`
    );
  }

  const changes = toChanges(toEdits(target, planned.value.splices, []));

  inspectProps(target, changes[0] ?? null, (names) => {
    if (names.has(command.name)) {
      return null;
    }

    return `The changed component lost the prop ${command.name}.`;
  });

  const callSites: CallSite[] = [];

  return toWork(target, {
    callSites,
    changes,
    default: planned.value.default,
    kind: command.kind,
    name: command.name,
    newName: null,
    title: `Prop: add ${target.model.name}.${command.name}`,
  });
};

const getRenameWork = async (
  scope: PropScope,
  command: RenameCommand
): Promise<PropWork> => {
  const target = await getTarget(scope, command);
  const planned = createRenamePlan(target.model, command.name, command.newName);

  if (!planned.ok) {
    throw toThrown(planned);
  }

  const sites = await listSites(target);

  inspectUncertain(sites, target);

  if (toCount(sites, command.newName) > 0) {
    throw new ConflictError(
      `Use sites of ${target.model.name} already pass ${command.newName}.`
    );
  }

  const work = toSiteEdits(sites, command.name, (attribute) =>
    toRenameSplice(attribute, command.newName)
  );

  const { callSites } = work;
  const changes = toChanges(toEdits(target, planned.value.splices, work.edits));

  inspectProps(target, changes[0] ?? null, (names) => {
    if (names.has(command.newName) && !names.has(command.name)) {
      return null;
    }

    return `The changed component does not hold ${command.newName} as expected.`;
  });

  return toWork(target, {
    callSites,
    changes,
    default: planned.value.default,
    kind: planned.value.kind,
    name: command.name,
    newName: command.newName,
    title: `Prop: rename ${target.model.name}.${command.name} to ${command.newName}`,
  });
};

const getDeleteWork = async (
  scope: PropScope,
  command: DeleteCommand
): Promise<PropWork> => {
  const target = await getTarget(scope, command);
  const planned = createDeletePlan(target.model, command.name);

  if (!planned.ok) {
    throw toThrown(planned);
  }

  const sites = await listSites(target);

  inspectUncertain(sites, target);

  const work = toSiteEdits(sites, command.name, (attribute, site) =>
    toRemoveSplice(site.code, attribute)
  );

  const { callSites } = work;
  const changes = toChanges(toEdits(target, planned.value.splices, work.edits));

  inspectProps(target, changes[0] ?? null, (names) => {
    if (names.has(command.name)) {
      return `The changed component still holds ${command.name}.`;
    }

    return null;
  });

  return toWork(target, {
    callSites,
    changes,
    default: planned.value.default,
    kind: planned.value.kind,
    name: command.name,
    newName: null,
    title: `Prop: delete ${target.model.name}.${command.name}`,
  });
};

const toListed = (row: PropRow, useCount: number): ListedProp => ({
  default: row.default,
  isDeclared: row.isDeclared,
  isRequired: row.isRequired,
  kind: row.kind,
  name: row.name,
  type: row.type,
  useCount,
});

const listWork = async (
  scope: PropScope,
  command: TargetCommand
): Promise<ListedProp[]> => {
  const target = await getTarget(scope, command);
  const sites = await listSites(target);

  return listProps(target.model).map((row) =>
    toListed(row, toCount(sites, row.name))
  );
};

export { getCreateWork, getDeleteWork, getRenameWork, listWork };

export type {
  CallSite,
  CreateCommand,
  DeleteCommand,
  FileChange,
  ListedProp,
  PropWork,
  RenameCommand,
};
