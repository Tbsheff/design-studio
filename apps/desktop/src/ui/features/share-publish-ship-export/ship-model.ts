import {
  renderBranchName,
  renderShipTemplate,
} from "@design-studio/contracts/ship";
import type {
  ShipFile,
  ShipMode,
  ShipPrepare,
  ShipRequest,
  ShipResult,
} from "@design-studio/contracts/ship";

const STATUS_LETTER: Record<ShipFile["status"], string> = {
  added: "A",
  deleted: "D",
  modified: "M",
};

const MODES: { id: ShipMode; label: string; hint: string }[] = [
  {
    hint: "Commit on a new local branch. Nothing leaves this computer.",
    id: "branch",
    label: "Branch only",
  },
  {
    hint: "Commit, then push the branch to the remote. No force push.",
    id: "push",
    label: "Push branch",
  },
  {
    hint: "Commit, push, then run gh pr create.",
    id: "pr",
    label: "Open pull request",
  },
];

interface Draft {
  files: Set<string>;
  branch: string | null;
  commitMessage: string | null;
  title: string | null;
  body: string | null;
  issue: string;
  mode: ShipMode;
}

const SHORT_HEAD = 7;

const shippable = (file: ShipFile): boolean => !file.refused && !file.conflict;

const toPaths = (
  files: ShipFile[],
  isIncluded: (file: ShipFile) => boolean
): string[] => {
  const paths: string[] = [];

  for (const file of files) {
    if (isIncluded(file)) {
      paths.push(file.path);
    }
  }

  return paths;
};

const freshDraft = (plan: ShipPrepare, mode: ShipMode): Draft => {
  const issue = plan.settings.issueId;
  const title = null;

  return {
    body: null,
    branch: null,
    commitMessage: null,
    files: new Set(toPaths(plan.files, shippable)),
    issue,
    mode,
    title,
  };
};

const modeBlock = (plan: ShipPrepare, mode: ShipMode): string | null => {
  const { repo } = plan;

  if (!repo || mode === "branch") {
    return null;
  }

  if (!repo.remote) {
    return "The repo has no remote.";
  }

  if (mode === "pr" && !repo.gh) {
    return "Install the GitHub CLI (gh) to open pull requests.";
  }

  if (mode === "pr" && !repo.github) {
    return "The remote is not on GitHub.";
  }

  return null;
};

const hooksNote = (skipped: string[]): string => {
  if (skipped.length > 0) {
    return `Repo hooks skipped (${skipped.join(", ")}).`;
  }

  return "Git hooks do not run.";
};

const footNote = (plan: ShipPrepare | null): string => {
  const format = plan?.format;

  if (!format) {
    return `${hooksNote([])} .env files, secrets and node_modules never ship.`;
  }

  const hooks = hooksNote(format.skipped);

  if (format.tool) {
    return `Formats with ${format.tool} first. ${hooks}`;
  }

  return `No formatter found, so files ship unformatted. ${hooks}`;
};

const formatFact = (format: NonNullable<ShipResult["format"]>): string => {
  if (!format.tool) {
    return "Not formatted (no biome or prettier config)";
  }

  const count = format.formatted.length;

  if (count === 0) {
    return `${format.tool}: no change needed`;
  }

  if (count === 1) {
    return `${format.tool} reformatted 1 file`;
  }

  return `${format.tool} reformatted ${count} files`;
};

interface Fields {
  title: string;
  branch: string;
  body: string;
  commitMessage: string;
}

const fieldsOf = (plan: ShipPrepare, draft: Draft): Fields => {
  const title = draft.title ?? plan.defaults.title;

  const vars = {
    ...plan.vars,
    files: toPaths(plan.files, (shipFile) => draft.files.has(shipFile.path)),
    issue: draft.issue,
    title,
  };

  return {
    body: draft.body ?? renderShipTemplate(plan.settings.bodyTemplate, vars),
    branch:
      draft.branch ?? renderBranchName(plan.settings.branchTemplate, vars),
    commitMessage: draft.commitMessage ?? plan.defaults.commitMessage,
    title,
  };
};

const conflictHint = (plan: ShipPrepare): string => {
  if (plan.base?.kind === "last-ship") {
    return "Your checked-out commit does not have the last ship yet, so some files differ from this base. Merge that branch and pull, or pick “When attached” to ship all studio changes again.";
  }

  return "Some files have your own changes that differ from the studio base. They cannot ship until you commit or undo them. Pick a file to see why.";
};

const leadText = (plan: ShipPrepare | null): string => {
  if (!plan?.repo) {
    return "Commit studio changes to a new branch in your repo.";
  }

  return `Makes a new branch from ${plan.repo.branch ?? plan.repo.head.slice(0, SHORT_HEAD)} in ${plan.repo.root}. Your checked-out branch, files and index do not change.`;
};

const shipRequestOf = (
  plan: ShipPrepare | null,
  draft: Draft | null,
  fields: Fields | null
): ShipRequest | null => {
  if (!plan?.base || !plan.headVersionId || plan.blocked) {
    return null;
  }

  if (!draft || !fields) {
    return null;
  }

  if (draft.files.size === 0 || modeBlock(plan, draft.mode)) {
    return null;
  }

  if (!fields.branch.trim() || !fields.commitMessage.trim()) {
    return null;
  }

  return {
    baseVersionId: plan.base.versionId,
    body: fields.body,
    branch: fields.branch.trim(),
    commitMessage: fields.commitMessage,
    files: toPaths(plan.files, (shipFile) => draft.files.has(shipFile.path)),
    headVersionId: plan.headVersionId,
    mode: draft.mode,
    title: fields.title,
  };
};

const actionLabel = (mode: ShipMode): string => {
  if (mode === "pr") {
    return "Open pull request";
  }

  if (mode === "push") {
    return "Push branch";
  }

  return "Create branch";
};

const FIRST_COMMIT = 'git init && git add -A && git commit -m "First commit"';

export {
  STATUS_LETTER,
  MODES,
  shippable,
  freshDraft,
  modeBlock,
  footNote,
  formatFact,
  fieldsOf,
  conflictHint,
  leadText,
  shipRequestOf,
  actionLabel,
  FIRST_COMMIT,
};

export type { Draft, Fields };
