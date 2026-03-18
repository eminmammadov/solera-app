import { MaintenancePageClient } from "@/components/maintenance/MaintenancePageClient";

interface MaintenancePageProps {
  searchParams: Promise<{ preview?: string }>;
}

export default async function MaintenancePage({ searchParams }: MaintenancePageProps) {
  const params = await searchParams;
  const isPreviewMode = params.preview === "1";

  return <MaintenancePageClient isPreviewMode={isPreviewMode} />;
}
