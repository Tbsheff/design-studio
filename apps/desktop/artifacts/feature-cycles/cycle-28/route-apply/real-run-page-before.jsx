import { prefetchPatients } from "../../lib/server";
import PatientList from "./patient-list";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  await prefetchPatients();
  return (
    <main style={{ padding: 32 }}>
      <h1>Patients</h1>
      <p>Ward list for today.</p>
      <PatientList />
    </main>
  );
}
