import type { ReactElement } from "react";

import { useDesktopApp } from "./use-desktop-app";

interface DesktopAppProps {
  readonly activeProjectId: string | null;
}

const DesktopApp = ({
  activeProjectId,
}: DesktopAppProps): ReactElement | null => {
  const error = useDesktopApp(activeProjectId);

  if (error) {
    return (
      <div className="desktop-notice" role="alert">
        {error}
      </div>
    );
  }

  return null;
};

export { DesktopApp };
