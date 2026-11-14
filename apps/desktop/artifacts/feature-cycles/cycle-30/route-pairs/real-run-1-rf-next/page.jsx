import { prefetchPatients } from "../../lib/server";
import PatientList from "./patient-list";
import styles from "./patients.module.css";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  await prefetchPatients();
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Patients</h1>
      <p className={styles.lead}>Ward list for today.</p>
      <PatientList />
    </main>
  );
}
