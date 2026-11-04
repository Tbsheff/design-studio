import type { ReactNode } from "react";

const BootMessage = ({ children }: { children: ReactNode }): ReactNode => (
  <div className="boot muted">{children}</div>
);

export { BootMessage };
