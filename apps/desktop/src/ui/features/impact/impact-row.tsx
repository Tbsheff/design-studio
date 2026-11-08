import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toShareText, toStatusText } from "./impact-model.js";
import type { ImpactRouteView } from "./impact-model.js";
import { ImpactThumb } from "./impact-thumb.js";

import styles from "./impact.module.css";

interface ImpactRowProps {
  readonly route: ImpactRouteView;
}

const ImpactRow = ({ route }: ImpactRowProps): ReactElement => (
  <li className={styles.item} data-status={route.status}>
    <div className={styles.row}>
      <span className={styles.name}>{route.route}</span>
      <span className={styles.status}>{toStatusText(route)}</span>
      <span className={`num ${styles.share}`}>{toShareText(route)}</span>
    </div>
    {route.note !== null && <p className={styles.note}>{route.note}</p>}
    <div className={styles.thumbs}>
      <ImpactThumb label={copy.before} src={route.before} />
      <ImpactThumb label={copy.after} src={route.after} />
      <ImpactThumb label={copy.diff} src={route.diff} />
    </div>
  </li>
);

export { ImpactRow };
