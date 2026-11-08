import type { Breadcrumb } from "./comment-placement.js";
import type { DesignComment, SelectionContext } from "./deps.js";

type Rect = SelectionContext["rect"];

interface OpenProps {
  comment: DesignComment;
  anchor: Rect;
  zoom: number;
  frame: { width: number; height: number };
  breadcrumb: Breadcrumb | null;
  initial: string | null;
  busy: boolean;
  onSend: () => void;
  onFix: (() => void) | null;
  onSave: (text: string) => void;
  onResolve: () => void;
  onReopen: () => void;
  onDelete: () => void;
  onClose: () => void;
  onReply: (text: string) => Promise<boolean>;
  onDeleteReply: (replyId: string) => void;
}

export type { OpenProps };
