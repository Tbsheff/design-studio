import type { ReactElement, ReactNode } from "react";

interface ActivitySectionProps {
  readonly children: ReactNode;
  readonly count: number | null;
  readonly empty: string;
  readonly isEmpty: boolean;
  readonly title: string;
}

const ActivitySection = ({
  children,
  count,
  empty,
  isEmpty,
  title,
}: ActivitySectionProps): ReactElement => (
  <section className="ide-act-sec" aria-label={title}>
    <h3>
      {title}
      {count !== null && count > 0 && <span>{count}</span>}
    </h3>
    {isEmpty && <p className="ide-act-empty">{empty}</p>}
    {children}
  </section>
);

export { ActivitySection };
