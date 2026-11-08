import type { ReactElement, ReactNode } from "react";

const Section = ({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count: number;
  action?: ReactNode;
  children: ReactNode;
}): ReactElement | null => {
  if (count === 0) {
    return null;
  }

  return (
    <section className="comments-section" aria-label={title}>
      <h3>
        {title} <span className="count">{count}</span>
        <span className="spacer" />
        {action}
      </h3>
      <ul className="comments-list">{children}</ul>
    </section>
  );
};

export { Section };
