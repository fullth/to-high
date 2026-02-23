"use client";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="px-6 py-5 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <Logo size="md" />
          <Link href="/">
            <Button variant="ghost" size="sm">
              돌아가기
            </Button>
          </Link>
        </div>
      </header>

      {/* 본문 */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* 제목 */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">개인정보처리방침</h1>
            <p className="text-sm text-muted-foreground">시행일: 2025년 2월 23일</p>
          </div>

          {/* 서문 */}
          <section className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              To High; 위로(이하 &quot;서비스&quot;)는 이용자의 개인정보를 중요하게 생각하며,
              개인정보보호법 등 관련 법령을 준수합니다. 본 개인정보처리방침을 통해
              이용자의 개인정보가 어떻게 수집, 이용, 보관, 파기되는지 안내드립니다.
            </p>
          </section>

          {/* 1. 수집하는 개인정보 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">1. 수집하는 개인정보</h2>
            <div className="space-y-3 text-muted-foreground">
              <div>
                <h3 className="font-semibold text-foreground mb-2">필수 수집 항목</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>소셜 로그인 정보: 이메일 주소, 이름, 프로필 사진 (Google/Kakao 제공)</li>
                  <li>상담 기록: 대화 내용, 상담 주제, 감정 상태</li>
                  <li>서비스 이용 기록: 접속 일시, 이용 기록</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">선택 수집 항목</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>결제 정보: 구독 결제 시 빌링키 (토스페이먼츠를 통해 안전하게 관리)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 2. 개인정보 수집 및 이용 목적 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">2. 개인정보 수집 및 이용 목적</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
              <li>
                <span className="font-medium text-foreground">맞춤형 상담 서비스 제공:</span>{" "}
                이전 상담 기록을 바탕으로 개인화된 상담 경험 제공
              </li>
              <li>
                <span className="font-medium text-foreground">서비스 개선:</span>{" "}
                서비스 품질 향상 및 신규 기능 개발
              </li>
              <li>
                <span className="font-medium text-foreground">회원 관리:</span>{" "}
                본인 확인, 서비스 이용 및 상담 기록 관리
              </li>
              <li>
                <span className="font-medium text-foreground">결제 처리:</span>{" "}
                유료 구독 서비스 결제 및 환불 처리
              </li>
            </ul>
          </section>

          {/* 3. 개인정보 보관 및 파기 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">3. 개인정보 보관 및 파기</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                이용자의 개인정보는 서비스 이용 기간 동안 보관되며,
                삭제 요청 시 지체 없이 파기합니다.
              </p>
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold text-foreground mb-2">보관 기간</h3>
                <ul className="space-y-1 text-sm">
                  <li>회원 정보: 삭제 요청 시까지</li>
                  <li>상담 기록: 삭제 요청 시까지 (사용자가 직접 삭제 가능)</li>
                  <li>결제 기록: 관련 법령에 따라 5년간 보관</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 4. 개인정보의 제3자 제공 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">4. 개인정보의 제3자 제공</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                서비스는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
                다만, 다음의 경우에는 예외로 합니다.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>이용자가 사전에 동의한 경우</li>
                <li>법령에 의해 요구되는 경우</li>
                <li>서비스 제공을 위해 필요한 경우 (결제 처리 등)</li>
              </ul>
              <div className="bg-card border border-border rounded-xl p-4 mt-4">
                <h3 className="font-semibold text-foreground mb-2">업무 위탁 현황</h3>
                <ul className="space-y-1 text-sm">
                  <li>토스페이먼츠: 결제 처리 및 빌링키 관리</li>
                  <li>OpenAI: AI 상담 응답 생성 (대화 내용 처리)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 5. 개인정보의 안전성 확보 조치 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">5. 개인정보의 안전성 확보 조치</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
              <li>개인정보는 암호화되어 저장 및 전송됩니다</li>
              <li>접근 권한을 최소화하여 관리합니다</li>
              <li>정기적인 보안 점검을 실시합니다</li>
              <li>개인정보 처리 시스템에 대한 접근 기록을 보관합니다</li>
            </ul>
          </section>

          {/* 6. 이용자의 권리 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">6. 이용자의 권리</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>개인정보 열람 요청</li>
                <li>개인정보 정정 요청</li>
                <li>개인정보 삭제 요청</li>
                <li>개인정보 처리 정지 요청</li>
              </ul>
              <p className="mt-3">
                상담 기록은 서비스 내에서 직접 삭제할 수 있습니다.
                회원 정보 삭제를 원하시면 이메일로 요청해주세요.
              </p>
            </div>
          </section>

          {/* 7. 쿠키 사용 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">7. 쿠키 사용</h2>
            <p className="text-muted-foreground">
              서비스는 로그인 상태 유지 등을 위해 쿠키를 사용합니다.
              이용자는 브라우저 설정을 통해 쿠키 사용을 거부할 수 있으나,
              이 경우 일부 서비스 이용이 제한될 수 있습니다.
            </p>
          </section>

          {/* 8. 개인정보 보호책임자 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">8. 개인정보 보호책임자</h2>
            <div className="bg-card border border-border rounded-xl p-4">
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">서비스명:</span> To High; 위로
                </li>
                <li>
                  <span className="font-medium text-foreground">문의:</span>{" "}
                  <a
                    href="mailto:xoghksdla@gmail.com"
                    className="text-primary hover:underline"
                  >
                    xoghksdla@gmail.com
                  </a>
                </li>
              </ul>
            </div>
          </section>

          {/* 9. 방침 변경 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">9. 개인정보처리방침 변경</h2>
            <p className="text-muted-foreground">
              본 개인정보처리방침은 법령 또는 서비스 정책 변경에 따라 수정될 수 있습니다.
              변경 시 서비스 내 공지를 통해 안내드립니다.
            </p>
          </section>

          {/* 하단 여백 */}
          <div className="pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              본 방침에 대한 문의사항은{" "}
              <a
                href="mailto:xoghksdla@gmail.com"
                className="text-primary hover:underline"
              >
                xoghksdla@gmail.com
              </a>
              로 연락주시기 바랍니다.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
