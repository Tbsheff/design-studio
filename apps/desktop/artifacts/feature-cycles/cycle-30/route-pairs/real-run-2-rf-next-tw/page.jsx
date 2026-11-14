import { prefetchPatients } from "../../lib/server";
import PatientList from "./patient-list";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  await prefetchPatients();
  return (
    <main className="mx-auto max-w-4xl px-8 py-12">
      <h1 className="mb-2 text-balance text-3xl font-bold tracking-tight">Patients</h1>
      <p className="mb-6 text-gray-600">Ward list for today.</p>
      <PatientList />
    </main>
  );
}
