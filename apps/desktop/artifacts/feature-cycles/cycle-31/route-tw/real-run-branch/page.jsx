import { prefetchPatients } from "../../lib/server";
import PatientList from "./patient-list";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  await prefetchPatients();
  return (
    <main className="mx-auto min-h-screen max-w-[880px] bg-gray-50 px-8 py-12">
      <h1 className="mb-6 text-[32px] leading-[normal] font-bold tracking-tight text-balance">Patients</h1>
      <p className="mb-6 text-gray-600">Ward list for today.</p>
      <PatientList />
    </main>
  );
}
