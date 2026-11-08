import type { ReactElement } from "react";

import type { DesignComment } from "./deps.js";
import { QueuedRow } from "./queued-row.js";
import { Section } from "./section.js";
import type { CommentsControl } from "./use-comments.js";

const QueuedSection = ({
  comments,
  control,
  title,
}: {
  comments: DesignComment[];
  control: CommentsControl;
  title: string;
}): ReactElement => (
  <Section title={title} count={comments.length}>
    {comments.map((comment, index) => (
      <QueuedRow
        key={comment.id}
        comment={comment}
        control={control}
        index={index}
        total={comments.length}
      />
    ))}
  </Section>
);

export { QueuedSection };
