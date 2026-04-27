"use client";

import { useEffect, useState } from "react";
import { ContactSidebar } from "@/components/contact-sidebar";
import { WirocareLanding } from "@/components/landing/wirocare-landing";
import { getPublicStats, PublicStats } from "@/lib/api";

export default function HomePage() {
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    getPublicStats()
      .then(setPublicStats)
      .catch(() => {});
  }, []);

  return (
    <>
      <WirocareLanding publicStatsToday={publicStats?.todayConversations} />
      <ContactSidebar />
    </>
  );
}
