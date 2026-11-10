import { FullPageLink } from "@/components/full-page-link";

export default function HelpNowPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 break-keep p-6 text-foreground">
      <FullPageLink href="/" className="font-semibold text-primary">위로</FullPageLink>
      <h1 className="text-2xl font-semibold">지금 도움이 필요할 때</h1>
      <p className="leading-7">
        위로는 AI 대화 서비스로, 실시간 긴급 구조나 전문 상담을 제공하지 않아요.
        혼자 감당하기 어렵다면 믿을 수 있는 가족, 선생님 또는 가까운 사람에게 알려주세요.
      </p>
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">바로 연락할 수 있어요</h2>
        <p className="leading-7">당장 위험하거나 다쳤다면 <a className="font-semibold text-primary underline" href="tel:119">119</a>에 연락해 주세요.</p>
        <p className="leading-7">자살 관련 위기 상담은 <a className="font-semibold text-primary underline" href="tel:109">109</a>에서 24시간 받을 수 있어요.</p>
        <p className="leading-7">청소년 상담은 1388에서 24시간 받을 수 있어요. 유선전화는 국번 없이 1388, 휴대전화는 지역번호와 1388을 눌러주세요. <a className="font-semibold text-primary underline" href="https://www.kyci.or.kr/userSite/sub02_1_cont.asp" target="_blank" rel="noopener noreferrer">청소년 상담 안내</a></p>
      </section>
      <p className="text-sm leading-6 text-muted-foreground">대화 이용 횟수가 남아 있지 않아도 이 안내를 볼 수 있어요. 서비스가 인터넷에 연결되지 않을 때는 전화로 직접 연락해 주세요.</p>
    </main>
  );
}
