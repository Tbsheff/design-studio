import { pageFileOf, type PageWait } from '../useFirstBuild';

function SkeletonPage() {
  return (
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
}

export function FrameSkeleton({ step, page, missing }: { step: string | null; page?: string; missing?: string }) {
  if (missing)
    return (
      <div className="frame-skeleton idle" role="status" data-testid="frame-missing">
        <div className="frame-skeleton-step">
          <span className="frame-skeleton-text">No page at {missing} yet</span>
        </div>
      </div>
    );
  return (
    <div className="frame-skeleton" role="status" aria-live="polite" data-testid="frame-skeleton">
      <SkeletonPage />
      <div className="frame-skeleton-step">
        <span className="spinner" aria-hidden="true" />
        <span className="frame-skeleton-text">{step ?? 'Building the first version'}</span>
        {page && <span className="frame-skeleton-page-name">{page}</span>}
      </div>
    </div>
  );
}

export function FirstBuildCover({ covered, wait, step, path }: { covered: boolean; wait: PageWait; step: string | null | undefined; path: string | undefined }) {
  if (wait === 'missing') return <FrameSkeleton step={null} missing={pageFileOf(path)} />;
  return covered ? <FrameSkeleton step={step ?? null} /> : null;
}
