import SidebarLayout from "@/components/sidebar/SidebarLayout";
import WorkerSidebar from "@/components/sidebar/WorkerSidebar";
import WorkerDashboard from "@/components/worker/WorkerDashboard";

export default function Page() {
  return (
    <SidebarLayout sidebar={<WorkerSidebar />}>
      <WorkerDashboard />
    </SidebarLayout>
  );
}
