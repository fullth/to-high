import { CounselorType } from "@/lib/api";

type TopLevelMode = "mbti" | "reaction" | "listening" | null;

/* eslint-disable @next/next/no-img-element */

export const topLevelModes = [
    {
        id: "mbti" as TopLevelMode,
        label: "MBTI 모드",
        description: "T/F 성향에 맞는 상담",
        color: "#6366F1",
        icon: (
            <img src="/to-high-icon-mbti-green.jpg" alt="MBTI 모드" className="block w-full h-full object-cover" draggable={false} />
        ),
    },
    {
        id: "reaction" as TopLevelMode,
        label: "리액션 모드",
        description: "짧은 반응, 가볍게 대화",
        color: "#9B8AA4",
        icon: (
            <img src="/to-high-icon-reaction-green.jpg" alt="리액션 모드" className="block w-full h-full object-cover" draggable={false} />
        ),
    },
    {
        id: "listening" as TopLevelMode,
        label: "경청 모드",
        description: "그냥 들어줄게요",
        color: "#7C9885",
        icon: (
            <img src="/to-high-icon-listening-green.jpg" alt="경청 모드" className="block w-full h-full object-cover" draggable={false} />
        ),
    },
];

export const mbtiSubTypes = [
    {
        id: "F" as CounselorType,
        label: "F - 감정형",
        description: "따뜻한 위로가 필요할 때",
        color: "#E8A0BF",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
        ),
    },
    {
        id: "T" as CounselorType,
        label: "T - 사고형",
        description: "현실적인 조언이 필요할 때",
        color: "#5B8FB9",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
        ),
    },
];

export const categories = [
    {
        id: "self",
        color: "#7C9885",
        label: "나",
        description: "마음, 감정",
        icon: (
            <img src="/to-high-icon-me-nobg.jpg" alt="나" className="block w-full h-full object-cover" draggable={false} />
        )
    },
    {
        id: "future",
        color: "#8BA4B4",
        label: "미래",
        description: "진로, 선택",
        icon: (
            <img src="/to-high-icon-future-nobg.jpg" alt="미래" className="block w-full h-full object-cover" draggable={false} />
        )
    },
    {
        id: "work",
        color: "#B4A48B",
        label: "일",
        description: "업무, 직장",
        icon: (
            <img src="/to-high-icon-work-nobg.jpg" alt="일" className="block w-full h-full object-cover" draggable={false} />
        )
    },
    {
        id: "relationship",
        color: "#9B8AA4",
        label: "관계",
        description: "가족, 친구",
        icon: (
            <img src="/to-high-icon-relationship-nobg.jpg" alt="관계" className="block w-full h-full object-cover" draggable={false} />
        )
    },
    {
        id: "love",
        color: "#C49B9B",
        label: "연애",
        description: "사랑, 이별",
        icon: (
            <img src="/to-high-icon-love-nobg.jpg" alt="연애" className="block w-full h-full object-cover" draggable={false} />
        )
    },
    {
        id: "daily",
        color: "#8B9BAA",
        label: "일상",
        description: "그냥 얘기",
        icon: (
            <img src="/to-high-icon-daily-nobg.jpg" alt="일상" className="block w-full h-full object-cover" draggable={false} />
        )
    },
];
