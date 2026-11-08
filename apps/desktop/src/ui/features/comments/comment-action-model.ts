import type { IconName } from "@design-studio/ui";

import { copy } from "./copy.js";
import type { DesignComment } from "./deps.js";

type CommentActionKind =
  | "delete"
  | "down"
  | "edit"
  | "fix"
  | "reopen"
  | "resolve"
  | "resolveText"
  | "sendNow"
  | "up";

interface ActionControl {
  readonly move: (id: string, delta: -1 | 1) => Promise<void>;
  readonly preparing: boolean;
  readonly remove: (id: string) => Promise<void>;
  readonly send: (ids?: string[]) => Promise<void>;
  readonly sending: boolean;
  readonly toChat: (ids: string[]) => Promise<void>;
  readonly update: (
    id: string,
    patch: { status: "queued" | "resolved" }
  ) => Promise<void>;
}

interface CommentActionContext {
  readonly comment: DesignComment;
  readonly control: ActionControl;
  readonly index: number;
  readonly total: number;
}

interface CommentActionSpec {
  readonly className: string;
  readonly icon: IconName;
  readonly iconSize: number;
  readonly isDisabled: (context: CommentActionContext) => boolean;
  readonly label: string | null;
  readonly name: (comment: DesignComment) => string;
  readonly run: (context: CommentActionContext) => Promise<void>;
  readonly testId: string | null;
  readonly tip: string | null;
}

const ICON_BUTTON = "icon-btn small";
const UP_BUTTON = "icon-btn small flip-up";
const ICON_SIZE = 16;
const TEXT_BUTTON = "btn small ghost";
const TEXT_ICON_SIZE = 14;

const isNever = (): boolean => false;

const keep = async (): Promise<void> => {
  await Promise.resolve();
};

const SPECS: Record<CommentActionKind, CommentActionSpec> = {
  delete: {
    className: ICON_BUTTON,
    icon: "close",
    iconSize: ICON_SIZE,
    isDisabled: isNever,
    label: null,
    name: (comment) => `Delete comment ${comment.n}`,
    run: ({ comment, control }) => control.remove(comment.id),
    testId: null,
    tip: null,
  },
  down: {
    className: ICON_BUTTON,
    icon: "chevronDown",
    iconSize: ICON_SIZE,
    isDisabled: ({ index, total }) => index === total - 1,
    label: null,
    name: (comment) => `Move comment ${comment.n} down`,
    run: ({ comment, control }) => control.move(comment.id, 1),
    testId: null,
    tip: null,
  },
  edit: {
    className: ICON_BUTTON,
    icon: "pencil",
    iconSize: ICON_SIZE,
    isDisabled: isNever,
    label: null,
    name: (comment) => `Edit comment ${comment.n}`,
    run: keep,
    testId: null,
    tip: null,
  },
  fix: {
    className: ICON_BUTTON,
    icon: "sparkle",
    iconSize: ICON_SIZE,
    isDisabled: ({ control }) => control.preparing,
    label: null,
    name: (comment) => `Fix comment ${comment.n} with the agent`,
    run: ({ comment, control }) => control.toChat([comment.id]),
    testId: "comment-fix",
    tip: copy.fix,
  },
  reopen: {
    className: TEXT_BUTTON,
    icon: "undo",
    iconSize: TEXT_ICON_SIZE,
    isDisabled: isNever,
    label: copy.reopen,
    name: (comment) => `Reopen comment ${comment.n}`,
    run: ({ comment, control }) =>
      control.update(comment.id, { status: "queued" }),
    testId: null,
    tip: null,
  },
  resolve: {
    className: ICON_BUTTON,
    icon: "check",
    iconSize: ICON_SIZE,
    isDisabled: isNever,
    label: null,
    name: (comment) => `Resolve comment ${comment.n}`,
    run: ({ comment, control }) =>
      control.update(comment.id, { status: "resolved" }),
    testId: null,
    tip: copy.resolve,
  },
  resolveText: {
    className: TEXT_BUTTON,
    icon: "check",
    iconSize: TEXT_ICON_SIZE,
    isDisabled: isNever,
    label: copy.resolve,
    name: (comment) => `Resolve comment ${comment.n}`,
    run: ({ comment, control }) =>
      control.update(comment.id, { status: "resolved" }),
    testId: null,
    tip: null,
  },
  sendNow: {
    className: ICON_BUTTON,
    icon: "arrowUp",
    iconSize: ICON_SIZE,
    isDisabled: ({ control }) => control.sending,
    label: null,
    name: (comment) => `Send comment ${comment.n} now`,
    run: ({ comment, control }) => control.send([comment.id]),
    testId: null,
    tip: null,
  },
  up: {
    className: UP_BUTTON,
    icon: "chevronDown",
    iconSize: ICON_SIZE,
    isDisabled: ({ index }) => index === 0,
    label: null,
    name: (comment) => `Move comment ${comment.n} up`,
    run: ({ comment, control }) => control.move(comment.id, -1),
    testId: null,
    tip: null,
  },
};

export { SPECS };

export type {
  ActionControl,
  CommentActionContext,
  CommentActionKind,
  CommentActionSpec,
};
