import { prefetchPatients } from "../../lib/server";
import PatientList from "./patient-list";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  await prefetchPatients();
  return (
    <main className="p-8 bg-background text-foreground">
      <h1 className="my-5 text-3xl font-bold text-balance">Patients</h1>
      <p className="mb-5 text-muted-foreground">Ward list for today.</p>
      <PatientList />
    </main>
  );
}
