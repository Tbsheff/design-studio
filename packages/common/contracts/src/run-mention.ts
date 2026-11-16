type RunMention =
  | { kind: "file"; path: string }
  | { kind: "token"; name: string; value: string }
  | {
      kind: "component";
      name: string;
      file: string | null;
      selector: string | null;
    }
  | { kind: "frame"; frameId: string; label: string | null };

type CommentMention = Exclude<RunMention, { kind: "frame" }>;

export type { CommentMention, RunMention };
