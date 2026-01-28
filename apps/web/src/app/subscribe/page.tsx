"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getPlans,
  createOrder,
  confirmPayment,
  getSubscription,
  SubscriptionPlan,
  SubscriptionInfo,
  SubscriptionTier,
} from "@/lib/api";

declare global {
  interface Window {
    TossPayments: any;
  }
}

function SubscribeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // 토스 결과 처리
  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      router.push("/?login=required");
      return;
    }
    setToken(storedToken);

    // 토스페이먼츠 SDK 로드
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v1/payment";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      try {
        const [plansRes, subRes] = await Promise.all([
          getPlans(),
          getSubscription(token),
        ]);
        setPlans(plansRes.plans);
        setSubscription(subRes);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [token]);

  // 결제 결과 처리
  useEffect(() => {
    if (!token || !paymentKey || !orderId || !amount) return;

    const tier = localStorage.getItem("pendingTier") as SubscriptionTier;
    if (!tier) return;

    const processPayment = async () => {
      setIsProcessing(true);
      try {
        await confirmPayment(paymentKey, orderId, parseInt(amount), tier, token);
        localStorage.removeItem("pendingTier");
        // 성공 - 새로고침해서 구독 상태 업데이트
        router.replace("/subscribe?success=true");
        window.location.reload();
      } catch (err: any) {
        setError(err.message || "결제 처리 중 오류가 발생했습니다.");
      } finally {
        setIsProcessing(false);
      }
    };

    processPayment();
  }, [token, paymentKey, orderId, amount, router]);

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!token || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const plan = plans.find((p) => p.tier === tier);
      if (!plan) throw new Error("요금제를 찾을 수 없습니다.");

      // 주문 생성
      const { orderId } = await createOrder(tier, token);

      // 결제 tier 임시 저장
      localStorage.setItem("pendingTier", tier);

      // 토스페이먼츠 결제 위젯 호출
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        throw new Error("결제 설정이 완료되지 않았습니다.");
      }

      const tossPayments = window.TossPayments(clientKey);
      await tossPayments.requestPayment("카드", {
        amount: plan.price,
        orderId,
        orderName: `위로 ${plan.name} 구독`,
        successUrl: `${window.location.origin}/subscribe`,
        failUrl: `${window.location.origin}/subscribe?error=payment_failed`,
      });
    } catch (err: any) {
      if (err.code === "USER_CANCEL") {
        // 사용자가 결제 취소
        localStorage.removeItem("pendingTier");
      } else {
        setError(err.message || "결제 요청 중 오류가 발생했습니다.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  const isSuccess = searchParams.get("success") === "true";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            돌아가기
          </button>
        </div>

        {/* 성공 메시지 */}
        {isSuccess && (
          <div className="mb-8 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-center">
            <p className="text-green-400 font-medium">구독이 완료되었습니다!</p>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 현재 구독 상태 */}
        {subscription?.isSubscribed && (
          <div className="mb-8 p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl">
            <h2 className="text-xl font-bold mb-2">현재 구독 중</h2>
            <p className="text-slate-300">
              {subscription.plan?.name} 플랜 · 월 {subscription.plan?.sessionLimit}개 공책
            </p>
            <p className="text-sm text-slate-400 mt-2">
              다음 결제일: {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString("ko-KR") : "-"}
            </p>
          </div>
        )}

        {subscription?.isGrandfathered && (
          <div className="mb-8 p-6 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl">
            <h2 className="text-xl font-bold mb-2">레거시 사용자</h2>
            <p className="text-slate-300">무제한 이용 가능합니다.</p>
          </div>
        )}

        {/* 타이틀 */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">더 많은 이야기를 나눠보세요</h1>
          <p className="text-slate-400">공책을 추가하고 마음을 더 자유롭게 표현하세요</p>
        </div>

        {/* 요금제 카드 */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={`relative p-6 rounded-2xl border-2 transition-all ${
                selectedTier === plan.tier
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
              }`}
              onClick={() => setSelectedTier(plan.tier as SubscriptionTier)}
            >
              {plan.tier === "premium" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-xs font-bold">
                  BEST
                </div>
              )}

              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold">{plan.price.toLocaleString()}</span>
                <span className="text-slate-400">원/월</span>
              </div>

              <p className="text-slate-300 mb-6">{plan.description}</p>

              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-slate-300">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  월 {plan.sessionLimit}개 공책 추가
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  무제한 대화
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  대화 기록 저장
                </li>
              </ul>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubscribe(plan.tier as SubscriptionTier);
                }}
                disabled={isProcessing || subscription?.isSubscribed}
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  subscription?.isSubscribed
                    ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                    : plan.tier === "premium"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    : "bg-slate-600 hover:bg-slate-500"
                }`}
              >
                {isProcessing ? "처리 중..." : subscription?.isSubscribed ? "이미 구독 중" : "구독하기"}
              </button>
            </div>
          ))}
        </div>

        {/* 안내 */}
        <div className="text-center text-sm text-slate-500">
          <p>구독은 언제든 취소할 수 있습니다.</p>
          <p className="mt-1">결제 관련 문의: support@to-high.com</p>
        </div>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
        </div>
      }
    >
      <SubscribeContent />
    </Suspense>
  );
}
