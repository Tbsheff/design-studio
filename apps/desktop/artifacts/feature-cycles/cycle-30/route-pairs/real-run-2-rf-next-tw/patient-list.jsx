"use client";

import { usePatients } from "../../lib/client";

export default function PatientList() {
  const rows = usePatients();
  return (
    <div className="overflow-hidden rounded-xl border border-gray-300 bg-white">
      <table className="w-full border-collapse text-left text-base leading-tight">
        <thead>
          <tr>
            <th className="border-b border-gray-300 bg-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">Name</th>
            <th className="border-b border-gray-300 bg-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">Ward</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-gray-200 last:border-b-0">
              <td className="px-5 py-4">{row.name}</td>
              <td className="px-5 py-4">
                <span className="inline-block whitespace-nowrap rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-700">{row.ward}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
