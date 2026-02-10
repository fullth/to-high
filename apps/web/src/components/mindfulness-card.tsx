"use client";

import { useState, useEffect } from "react";

// 마음 돌봄 콘텐츠 데이터
const mindfulnessContents = [
    {
        type: "quote",
        content: "당신은 지금 이 순간에도 충분히 잘하고 있어요.",
        author: "To High; 위로",
    },
    {
        type: "tip",
        title: "오늘의 마음 돌봄",
        content: "깊게 숨을 들이쉬고, 천천히 내쉬어 보세요. 지금 이 순간에 집중해보세요.",
    },
    {
        type: "quote",
        content: "완벽하지 않아도 괜찮아요. 그게 바로 당신이니까요.",
        author: "To High; 위로",
    },
    {
        type: "tip",
        title: "잠깐, 쉬어가세요",
        content: "지금 어깨에 힘이 들어가 있진 않나요? 한번 툭 내려놓아 보세요.",
    },
    {
        type: "quote",
        content: "힘든 감정도 당신의 일부예요. 느끼는 대로 느껴도 돼요.",
        author: "To High; 위로",
    },
    {
        type: "tip",
        title: "나를 위한 시간",
        content: "오늘 하루 중 잠깐이라도 나를 위한 시간을 가져보세요.",
    },
    {
        type: "quote",
        content: "비 온 뒤에 땅이 굳듯, 힘든 시간은 당신을 더 단단하게 해줄 거예요.",
        author: "To High; 위로",
    },
    {
        type: "tip",
        title: "작은 실천",
        content: "오늘 나에게 '수고했어'라고 말해주세요. 작은 위로가 큰 힘이 됩니다.",
    },
];

export function MindfulnessCard() {
    const [contentIndex, setContentIndex] = useState(0);

    useEffect(() => {
        // 페이지 로드 시 랜덤 콘텐츠 선택
        setContentIndex(Math.floor(Math.random() * mindfulnessContents.length));
    }, []);

    const content = mindfulnessContents[contentIndex];
    const nextContent = () => {
        setContentIndex((prev) => (prev + 1) % mindfulnessContents.length);
    };

    return (
        <div className="rounded-2xl border border-accent/50 bg-accent/20 p-6 space-y-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground/90 flex items-center gap-2">
                    <span className="text-xl">🌿</span>
                    <span className="font-serif italic text-lg">마음 한 스푼</span>
                </p>
                <button
                    onClick={nextContent}
                    className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    title="다음 글"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {content.type === "quote" ? (
                <div className="space-y-3">
                    <p className="text-base leading-relaxed text-foreground/80 italic font-serif">
                        "{content.content}"
                    </p>
                    <p className="text-xs text-muted-foreground text-right">
                        — {content.author}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-primary">{content.title}</p>
                    <p className="text-base leading-relaxed text-foreground/80 font-serif">
                        {content.content}
                    </p>
                </div>
            )}
        </div>
    );
}
