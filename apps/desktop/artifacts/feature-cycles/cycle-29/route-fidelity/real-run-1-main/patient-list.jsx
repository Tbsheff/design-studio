"use client";

import { usePatients } from "../../lib/client";
import styles from "./patients.module.css";

export default function PatientList() {
  const rows = usePatients();
  return (
    <div className={styles.card}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Name</th>
            <th className={styles.th}>Ward</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={styles.row}>
              <td className={styles.td}>{row.name}</td>
              <td className={styles.td}>
                <span className={styles.ward}>{row.ward}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
