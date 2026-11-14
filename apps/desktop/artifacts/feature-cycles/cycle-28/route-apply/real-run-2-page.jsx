import { prefetchPatients } from "../../lib/server";
import PatientList from "./patient-list";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  await prefetchPatients();
  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: "21px 0", textWrap: "balance" }}>Patients</h1>
      <p style={{ margin: "0 0 16px" }}>Ward list for today.</p>
      <PatientList />
    </main>
  );
}
