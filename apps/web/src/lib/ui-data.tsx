import { CounselorType, TopLevelMode } from "@/types/chat";

export const topLevelModes = [
    {
        id: "mbti" as TopLevelMode,
        label: "MBTI 모드",
        description: "T/F 성향에 맞는 상담",
        color: "#6366F1",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a7 7 0 0 0 0 14 7 7 0 0 0 0-14" />
                <path d="M12 8v8" />
                <path d="M8 12h8" />
            </svg>
        ),
    },
    {
        id: "reaction" as TopLevelMode,
        label: "리액션 모드",
        description: "짧은 반응, 가볍게 대화",
        color: "#9B8AA4",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        ),
    },
    {
        id: "listening" as TopLevelMode,
        label: "경청 모드",
        description: "그냥 들어줄게요",
        color: "#7C9885",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
            </svg>
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <circle cx="12" cy="8" r="4" />
                <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
            </svg>
        )
    },
    {
        id: "future",
        color: "#8BA4B4",
        label: "미래",
        description: "진로, 선택",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
            </svg>
        )
    },
    {
        id: "work",
        color: "#B4A48B",
        label: "일",
        description: "업무, 직장",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3" />
            </svg>
        )
    },
    {
        id: "relationship",
        color: "#9B8AA4",
        label: "관계",
        description: "가족, 친구",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <circle cx="9" cy="7" r="3" />
                <circle cx="15" cy="7" r="3" />
                <path d="M3 21v-2a4 4 0 0 1 4-4h2m6 0h2a4 4 0 0 1 4 4v2" />
            </svg>
        )
    },
    {
        id: "love",
        color: "#C49B9B",
        label: "연애",
        description: "사랑, 이별",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
        )
    },
    {
        id: "daily",
        color: "#8B9BAA",
        label: "일상",
        description: "그냥 얘기",
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        )
    },
];
