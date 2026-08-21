import { PUBLIC_SERVICE_VISIBILITY } from "@/lib/service-visibility";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export default function DiaryLayout({ children }: { children: ReactNode }) {
  if (!PUBLIC_SERVICE_VISIBILITY.diary) {
    notFound();
  }

  return children;
}
