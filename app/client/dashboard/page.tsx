import SidebarLayout from "@/components/sidebar/SidebarLayout";
import ClientSidebar from "@/components/sidebar/ClientSidebar";
import ClientDashboard from "@/components/client/ClientDashboard";

export default function Page() {
  return (
    <SidebarLayout sidebar={<ClientSidebar />}>
      <ClientDashboard />
    </SidebarLayout>
  );
}
