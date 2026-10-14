import { WirocareLanding } from "@/components/landing/wirocare-landing";
import { ChannelTalk } from "@/components/channel-talk";
import { CoffeeSupport } from "@/components/coffee-support";

export default function HomePage() {
  return (
    <>
      <WirocareLanding />
      <ChannelTalk />
      <CoffeeSupport />
    </>
  );
}
