"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MaintenanceScreen } from "@/components/maintenance/MaintenanceScreen";
import {
  fetchPublicMaintenanceStatus,
  type PublicMaintenanceStatusResponse,
} from "@/lib/public/system-public";

interface MaintenancePageClientProps {
  isPreviewMode: boolean;
}

const POLL_INTERVAL_MS = 5_000;

export function MaintenancePageClient({ isPreviewMode }: MaintenancePageClientProps) {
  const router = useRouter();
  const redirectedRef = useRef(false);
  const [status, setStatus] = useState<PublicMaintenanceStatusResponse | null>(null);

  useEffect(() => {
    let alive = true;

    const syncStatus = async () => {
      try {
        const data = await fetchPublicMaintenanceStatus();
        if (!alive) return;

        setStatus(data);

        if (!isPreviewMode && !data.isActive && !redirectedRef.current) {
          redirectedRef.current = true;
          router.replace("/");
          router.refresh();
        }
      } catch {
        // Keep maintenance page visible when status endpoint is unavailable.
      }
    };

    void syncStatus();
    const intervalId = window.setInterval(syncStatus, POLL_INTERVAL_MS);

    return () => {
      alive = false;
      clearInterval(intervalId);
    };
  }, [isPreviewMode, router]);

  return (
    <MaintenanceScreen
      maintenanceMessage={status?.maintenanceMessage}
      maintenanceStartsAt={status?.maintenanceStartsAt}
    />
  );
}
