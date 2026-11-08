import { CopyButton } from "@design-studio/ui";
import type { ReactElement } from "react";

const DoctorCommand = ({
  command,
}: {
  readonly command: string;
}): ReactElement => (
  <div className="home-doctor-cmd">
    <code className="truncate">{command}</code>
    <CopyButton text={command} label="Copy the install command" />
  </div>
);

export { DoctorCommand };
