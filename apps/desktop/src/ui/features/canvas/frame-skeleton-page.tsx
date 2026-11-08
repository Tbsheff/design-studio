import type { ReactElement } from "react";

const SkeletonPage = (): ReactElement => (
  <div className="frame-skeleton-page" aria-hidden="true">
    <div className="sk-nav">
      <span className="sk-block sk-logo" />
      <span className="sk-block sk-link" />
      <span className="sk-block sk-link" />
      <span className="sk-block sk-link" />
    </div>
    <div className="sk-hero">
      <span className="sk-block sk-title" />
      <span className="sk-block sk-title short" />
      <span className="sk-block sk-text" />
      <span className="sk-block sk-button" />
    </div>
    <div className="sk-grid">
      <span className="sk-block sk-card" />
      <span className="sk-block sk-card" />
      <span className="sk-block sk-card" />
    </div>
  </div>
);

export { SkeletonPage };
