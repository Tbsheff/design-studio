import type { ReactElement } from "react";

import type { DesignComment } from "./deps.js";
import { DoneRow } from "./done-row.js";
import { Section } from "./section.js";
import type { CommentsControl } from "./use-comments.js";

const DoneSection = ({
  comments,
  control,
  count,
  onOpenRun,
  onOpenVersion,
  title,
}: {
  comments: DesignComment[];
  control: CommentsControl;
  count: number;
  onOpenRun: (runId: string) => void;
  onOpenVersion: (versionId: string) => void;
  title: string;
}): ReactElement => (
  <Section title={title} count={count}>
    {comments.map((comment) => (
      <DoneRow
        key={comment.id}
        comment={comment}
        control={control}
        onOpenRun={onOpenRun}
        onOpenVersion={onOpenVersion}
      />
    ))}
  </Section>
);

export { DoneSection };
