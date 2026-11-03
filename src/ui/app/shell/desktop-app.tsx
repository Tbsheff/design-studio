import { useDesktopApp } from "./use-desktop-app";

export default function DesktopApp({
  activeProjectId,
}: {
  activeProjectId: string | null;
}) {
  const error = useDesktopApp(activeProjectId);
  return error ? (
    <div className="desktop-notice" role="alert">
      {error}
    </div>
  ) : null;
}
