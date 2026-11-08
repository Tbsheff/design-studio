import type { ReactElement } from "react";

import type { DesignComment } from "./deps.js";
import { OrphanRow } from "./orphan-row.js";
import { Section } from "./section.js";
import type { CommentsControl } from "./use-comments.js";

const OrphanSection = ({
  comments,
  control,
  title,
}: {
  comments: DesignComment[];
  control: CommentsControl;
  title: string;
}): ReactElement => (
  <Section title={title} count={comments.length}>
    {comments.map((comment) => (
      <OrphanRow key={comment.id} comment={comment} control={control} />
    ))}
  </Section>
);

export { OrphanSection };
