"use client";

import { usePatients } from "../../lib/client";

export default function PatientList() {
  const rows = usePatients();
  return (
    <table>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}><td>{row.name}</td><td>{row.ward}</td></tr>
        ))}
      </tbody>
    </table>
  );
}
