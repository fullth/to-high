import Image from "next/image";

export function ConversationLoading() {
  return (
    <main className="conversation-loading" aria-live="polite">
      <section className="conversation-loading-card">
        <Image
          src="/conversation-loading-levi.png"
          alt=""
          width={180}
          height={180}
          priority
          className="conversation-loading-levi"
        />
        <p className="conversation-loading-eyebrow">위로</p>
        <h1>대화를 준비하고 있어요</h1>
        <p>레비가 잠시 마음을 가다듬고 있어요.</p>
        <span className="conversation-loading-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </section>
    </main>
  );
}
