import { AppLayout } from "@/components/AppLayout";
import { RepertorioClient } from "@/components/RepertorioClient";
import { UnderConstructionBanner } from "@/components/UnderConstructionBanner";

export default function RepertorioPage() {
  return (
    <AppLayout>
      <UnderConstructionBanner pageName="Repertório" />
      <RepertorioClient />
    </AppLayout>
  );
}