import { FullPageLink } from "@/components/full-page-link";
import "./privacy.css";

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <div className="privacy-content">
      <FullPageLink className="privacy-brand" href="/">위로 <span>TO HIGH</span></FullPageLink>
      <header className="privacy-intro">
        <p className="privacy-kicker">개인정보 안내</p>
        <h1>개인정보와 대화 처리 안내</h1>
        <p>대화가 어떻게 처리되고, 선택한 저장 내용이 어디에 보관되는지 알려드려요.</p>
      </header>
      <nav className="privacy-nav" aria-label="안내 항목">
        <a href="#conversation">대화와 저장</a>
        <a href="#usage">이용 한도</a>
        <a href="#providers">AI 제공자</a>
        <a href="#deletion">삭제 범위</a>
      </nav>
      <section id="conversation" className="space-y-3">
        <h2 className="text-lg font-semibold">상담 원문과 선택 저장</h2>
        <p>
          상담은 기본적으로 브라우저 화면의 메모리에서만 유지해요. 저장하지 않고
          화면을 떠나면 대화가 사라져요. 상담 종료 시 직접 저장을 선택하면 대화 원문과
          대화 주제를 요약한 제목을 로그인 계정에 저장하며, 저장된 상담 목록에서 삭제할 수 있어요.
          로그인 전 저장을 선택하면 로그인 중 이 브라우저 탭의 임시 저장소에 대화를 보관해요.
        </p>
        <p>
          답변을 만들 때는 현재 대화가 서비스 서버와 AI 제공자에게 전달돼
          처리돼요. 따라서 컴퓨터 안에서만 처리되는 서비스는 아니에요.
        </p>
      </section>
      <section id="usage" className="space-y-3">
        <h2 className="text-lg font-semibold">대화 이용 한도</h2>
        <p>
          비로그인 대화의 이용 횟수를 확인하기 위해 브라우저 저장소에 무작위
          식별자를 보관해요. 서버에는 IP 주소와 이 식별자 또는 로그인 계정의
          정보를 원문 대신 식별하기 어려운 값으로 변환해 횟수를 보관해요.
          IP와 계정의 일별 횟수는 약 3일이 지나면 삭제되고, 비로그인 브라우저의
          체험 횟수는 중복 체험 제한을 위해 계속 보관해요. 같은 인터넷 연결을 쓰는 사람은
          비로그인 한도를 함께 사용할 수 있어요.
        </p>
      </section>
      <section id="analytics" className="space-y-3">
        <h2 className="text-lg font-semibold">홈 방문 통계</h2>
        <p>
          홈 화면의 방문 현황을 확인하기 위해 Google Analytics를 사용해요.
          상담 화면과 로그인 처리 화면에는 이 측정 기능을 적용하지 않으며,
          상담 내용이나 로그인 정보를 통계로 보내지 않아요. Google은 방문을
          구분하기 위해 브라우저에 식별자를 저장할 수 있어요.
        </p>
      </section>
      <section id="contact" className="space-y-3">
        <h2 className="text-lg font-semibold">문의와 후원</h2>
        <p>
          홈페이지의 문의는 채널톡에서 별도로 처리해요. AI 상담 대화를 문의에
          자동으로 전달하지 않아요. 커피 후원은 카카오페이로 연결돼요.
        </p>
      </section>
      <section id="account" className="space-y-3">
        <h2 className="text-lg font-semibold">직접 승인한 기억과 로그인</h2>
        <p>
          캐릭터 기능에는 로그인 계정 정보와 캐릭터 이름과 대화 스타일, 직접
          작성하고 확인한 짧은 기억을 저장해요. 상담에서 기억을 자동 추출하거나
          원문을 자동 저장하지 않아요. 승인한 기억은 다음 캐릭터 상담의 서버와 AI
          처리 맥락에 포함돼요.
        </p>
        <p>
          설정 화면에서 승인한 기억을 수정하거나 삭제하거나 캐릭터와 그 기억을 함께
          삭제할 수 있어요. 로그인 상태 유지를 위한 토큰은 브라우저 저장소에
          보관해요. 상담 원문은 직접 저장을 선택한 경우에만 계정에 보관해요.
        </p>
      </section>
      <section id="providers" className="space-y-3">
        <h2 className="text-lg font-semibold">AI 제공자 측 처리</h2>
        <p>
          API 요청에 저장 비활성화를 적용해도 제공자의 모든 로그 보관이 없어지는
          것은 아니에요. OpenAI의 기본 API 악용 감시 로그는 일반적으로 최대 30일
          보관될 수 있으며, 예외나 별도 계약, 설정에 따라 달라져요. 이 서비스가
          별도 승인된 Zero Data Retention 환경이라는 보장은 하지 않아요.
        </p>
        <a
          className="underline"
          href="https://developers.openai.com/api/docs/guides/your-data"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenAI API 데이터 처리 조건 확인
        </a>
      </section>
      <section id="deletion" className="space-y-3">
        <h2 className="text-lg font-semibold">기존 데이터와 삭제 범위</h2>
        <p>
          이전 제품에서 저장된 상담 데이터는 이번 변경에서 임의로 삭제하지
          않았어요. 새 상담과 캐릭터 화면에서는 기존 상담 원문이나 요약을 불러오지
          않아요.
        </p>
        <p>
          기억 삭제는 현재 서비스 데이터베이스의 해당 기억을 삭제하는
          기능이에요. 기존 계정 정보와 운영 백업의 보존 기간과 삭제 정책은 별도
          확인이 필요하며, 모든 사본의 즉시 삭제를 보장하는 안내는 하지 않아요.
        </p>
      </section>
      <p className="privacy-footer">
        민감한 개인정보를 입력할 필요는 없어요. AI 대화는 전문적인 진단이나 치료를
        대신하지 않아요.
      </p>
      </div>
    </main>
  );
}
