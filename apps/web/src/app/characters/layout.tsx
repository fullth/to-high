import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CHARACTER_MEMORY_AVAILABLE } from "@/lib/product-features";

export default function CharactersLayout({ children }: { children: ReactNode }) {
  if (!CHARACTER_MEMORY_AVAILABLE) notFound();
  return children;
}
