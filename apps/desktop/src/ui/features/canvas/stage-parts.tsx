import { Suspense } from "react";
import type { ReactElement } from "react";

import { AccountButton } from "../account/index.js";
import { RenderCheckPanel } from "../review/render-check-panel.js";
import type { RenderCheckState } from "./use-preview-url.js";

interface CheckResultsProps {
  readonly projectId: string;
  readonly check: RenderCheckState;
}

const CheckResults = ({
  projectId,
  check,
}: CheckResultsProps): ReactElement | null => {
  const { results, error, close } = check;

  if (!results && !error) {
    return null;
  }

  return (
    <RenderCheckPanel
      projectId={projectId}
      results={results}
      error={error}
      onClose={close}
    />
  );
};

const AccountSlot = (): ReactElement => (
  <Suspense fallback={null}>
    <AccountButton />
  </Suspense>
);

export { AccountSlot, CheckResults };
