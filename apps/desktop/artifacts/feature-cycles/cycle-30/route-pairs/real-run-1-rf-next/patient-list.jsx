"use client";

import { usePatients } from "../../lib/client";
import styles from "./patients.module.css";

export default function PatientList() {
  const rows = usePatients();
  return (
    <div className={styles.card}>
      <table className={styles.list}>
        <thead>
          <tr><th>Name</th><th>Ward</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td><span className={styles.ward}>{row.ward}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
