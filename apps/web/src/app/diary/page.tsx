"use client";

import { useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// 감정 이모지 옵션
const moodOptions = [
  { value: 1, emoji: "😢", label: "매우 안좋음", color: "#6366F1" },
  { value: 2, emoji: "😔", label: "안좋음", color: "#8B5CF6" },
  { value: 3, emoji: "😐", label: "보통", color: "#A78BFA" },
  { value: 4, emoji: "🙂", label: "좋음", color: "#C4B5FD" },
  { value: 5, emoji: "😄", label: "매우 좋음", color: "#DDD6FE" },
];

// 태그 옵션
const tagOptions = [
  { id: "sleep", label: "수면", emoji: "😴" },
  { id: "exercise", label: "운동", emoji: "🏃" },
  { id: "work", label: "일", emoji: "💼" },
  { id: "social", label: "사람들", emoji: "👥" },
  { id: "alcohol", label: "음주", emoji: "🍺" },
  { id: "caffeine", label: "카페인", emoji: "☕" },
  { id: "weather", label: "날씨", emoji: "🌤️" },
  { id: "health", label: "건강", emoji: "💊" },
];

// 목업 데이터 - 최근 7일
const mockWeekData = [
  { date: "2/3", mood: 3, note: "" },
  { date: "2/4", mood: 4, note: "친구 만남" },
  { date: "2/5", mood: 2, note: "야근" },
  { date: "2/6", mood: null, note: "" }, // 오늘, 미입력
];

export default function DiaryPage() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [view, setView] = useState<"input" | "history">("input");

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      {/* 헤더 */}
      <header className="border-b border-white/10 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex gap-2">
            <Button
              variant={view === "input" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("input")}
              className={view === "input" ? "bg-[#6366F1]" : ""}
            >
              기록
            </Button>
            <Button
              variant={view === "history" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("history")}
              className={view === "history" ? "bg-[#6366F1]" : ""}
            >
              통계
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {view === "input" ? (
          /* 기록 입력 화면 */
          <div className="space-y-6">
            {/* 날짜 */}
            <div className="text-center">
              <p className="text-white/60 text-sm">2025년 2월 6일</p>
              <h1 className="text-xl font-semibold mt-1">오늘 기분은 어때요?</h1>
            </div>

            {/* 감정 선택 */}
            <div className="flex justify-center gap-3">
              {moodOptions.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setSelectedMood(mood.value)}
                  className={`
                    w-14 h-14 rounded-full text-3xl transition-all
                    ${selectedMood === mood.value
                      ? "bg-[#6366F1] scale-110 shadow-lg shadow-[#6366F1]/30"
                      : "bg-white/5 hover:bg-white/10"
                    }
                  `}
                >
                  {mood.emoji}
                </button>
              ))}
            </div>

            {/* 선택된 감정 라벨 */}
            {selectedMood && (
              <p className="text-center text-[#6366F1] font-medium">
                {moodOptions.find(m => m.value === selectedMood)?.label}
              </p>
            )}

            {/* 메모 */}
            <div>
              <label className="block text-sm text-white/60 mb-2">
                오늘 하루 메모 (선택)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="오늘 있었던 일, 느낀 감정..."
                className="w-full h-24 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-[#6366F1]"
              />
            </div>

            {/* 태그 */}
            <div>
              <label className="block text-sm text-white/60 mb-2">
                영향을 준 것 (선택)
              </label>
              <div className="flex flex-wrap gap-2">
                {tagOptions.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-all
                      ${selectedTags.includes(tag.id)
                        ? "bg-[#6366F1] text-white"
                        : "bg-white/5 text-white/70 hover:bg-white/10"
                      }
                    `}
                  >
                    <span>{tag.emoji}</span>
                    <span>{tag.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 저장 버튼 */}
            <Button
              className="w-full bg-[#6366F1] hover:bg-[#5558E3] h-12 text-base"
              disabled={!selectedMood}
            >
              오늘의 기분 저장하기
            </Button>

            {/* 주간 미니 캘린더 */}
            <Card className="bg-white/5 border-white/10 p-4">
              <h3 className="text-sm text-white/60 mb-3">이번 주</h3>
              <div className="flex justify-between">
                {mockWeekData.map((day, i) => (
                  <div key={i} className="text-center">
                    <p className="text-xs text-white/40 mb-1">{day.date}</p>
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-xl
                      ${day.mood ? "bg-white/10" : "bg-white/5 border border-dashed border-white/20"}
                    `}>
                      {day.mood ? moodOptions[day.mood - 1].emoji : "?"}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          /* 통계 화면 */
          <div className="space-y-6">
            <h1 className="text-xl font-semibold">감정 통계</h1>

            {/* 월간 평균 */}
            <Card className="bg-white/5 border-white/10 p-4">
              <h3 className="text-sm text-white/60 mb-2">2월 평균 기분</h3>
              <div className="flex items-center gap-3">
                <span className="text-4xl">🙂</span>
                <div>
                  <p className="text-2xl font-bold">3.2</p>
                  <p className="text-xs text-white/40">지난달 대비 +0.3</p>
                </div>
              </div>
            </Card>

            {/* 주간 그래프 (간단 바 차트) */}
            <Card className="bg-white/5 border-white/10 p-4">
              <h3 className="text-sm text-white/60 mb-4">최근 7일</h3>
              <div className="flex items-end justify-between h-32 gap-2">
                {[3, 4, 2, 3, 5, 4, null].map((mood, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t transition-all ${mood ? "bg-[#6366F1]" : "bg-white/10"}`}
                      style={{ height: mood ? `${mood * 20}%` : "10%" }}
                    />
                    <span className="text-xs text-white/40">
                      {["월", "화", "수", "목", "금", "토", "일"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* 영향 요인 분석 */}
            <Card className="bg-white/5 border-white/10 p-4">
              <h3 className="text-sm text-white/60 mb-3">기분에 영향을 준 것</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span>😴</span> 수면
                  </span>
                  <span className="text-[#6366F1]">+0.8</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span>🏃</span> 운동
                  </span>
                  <span className="text-[#6366F1]">+0.5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span>🍺</span> 음주
                  </span>
                  <span className="text-red-400">-0.7</span>
                </div>
              </div>
            </Card>

            {/* AI 인사이트 */}
            <Card className="bg-gradient-to-r from-[#6366F1]/20 to-[#8B5CF6]/20 border-[#6366F1]/30 p-4">
              <h3 className="text-sm text-[#6366F1] mb-2">AI 인사이트</h3>
              <p className="text-sm text-white/80">
                술을 마신 다음날 기분이 평균 0.7점 낮아요. 이번 주는 음주를 줄여보는 건 어떨까요?
              </p>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
