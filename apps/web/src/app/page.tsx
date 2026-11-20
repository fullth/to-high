import { WirocareLanding } from "@/components/landing/wirocare-landing";
import { ChannelTalk } from "@/components/channel-talk";
import { CoffeeSupport } from "@/components/coffee-support";
import { HomeAnalytics } from "@/components/home-analytics";
import type { Viewport } from "next";
import { SERVICE_DESCRIPTION, SITE_URL } from "@/lib/site-content";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function HomePage() {
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "위로",
    url: SITE_URL,
    description: SERVICE_DESCRIPTION,
    inLanguage: "ko",
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(website).replace(/</g, "\\u003c"),
        }}
      />
      <HomeAnalytics />
      <WirocareLanding />
      <ChannelTalk />
      <CoffeeSupport />
    </>
  );
}
