import styles from "./professional-help-notice.module.css";

export function ProfessionalHelpNotice({ className }: { className?: string }) {
  return (
    <p className={[styles.notice, className].filter(Boolean).join(" ")}>
      ※ 우울감 등 말하기 어려운 고민이 있거나 주변에 이런 어려움을 겪는 가족,
      지인이 있을 경우 자살 예방 상담 전화 <a href="tel:109">☎109</a> 또는 자살
      예방 SNS 상담 &quot;
      <a
        href="https://www.madeullan.or.kr/consult/guide"
        target="_blank"
        rel="noopener noreferrer"
        referrerPolicy="no-referrer"
      >
        마들랜
      </a>
      &quot;에서 24시간 전문가의 상담을 받을 수 있습니다.
    </p>
  );
}
