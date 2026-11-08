import type { ReactElement, ReactNode } from "react";

interface ShareSwitchRowProps {
  readonly rowClass: string;
  readonly title: string;
  readonly help: string;
  readonly children: ReactNode;
}

const ShareSwitchRow = ({
  children,
  rowClass,
  help,
  title,
}: ShareSwitchRowProps): ReactElement => (
  <div className={rowClass}>
    <div className="share-lan-text">
      <span className="share-lan-title">{title}</span>
      <span className="share-lan-help">{help}</span>
    </div>
    {children}
  </div>
);

export { ShareSwitchRow };
