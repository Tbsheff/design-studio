"use client";

import { usePatients } from "../../lib/client";

export default function PatientList() {
  const rows = usePatients();
  return (
    <table className="text-foreground">
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="align-middle"><td className="align-middle">{row.name}</td><td className="align-middle">{row.ward}</td></tr>
        ))}
      </tbody>
    </table>
  );
}
