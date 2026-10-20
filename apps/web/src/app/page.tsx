import { WirocareLanding } from "@/components/landing/wirocare-landing";
import { ChannelTalk } from "@/components/channel-talk";
import { CoffeeSupport } from "@/components/coffee-support";
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function HomePage() {
  return (
    <>
      <WirocareLanding />
      <ChannelTalk />
      <CoffeeSupport />
    </>
  );
}
