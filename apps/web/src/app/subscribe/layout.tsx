import { PUBLIC_SERVICE_VISIBILITY } from "@/lib/service-visibility";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export default function SubscribeLayout({ children }: { children: ReactNode }) {
  if (!PUBLIC_SERVICE_VISIBILITY.subscription) {
    notFound();
  }

  return children;
}
