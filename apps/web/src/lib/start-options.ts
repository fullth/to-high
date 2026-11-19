import type { EntryContext } from "./entry-context";
import { OTHER_TOPIC } from "./entry-context";

type Topic = { id: string; options: readonly string[] };
const everyday: readonly Topic[] = [
  {
    id: "work",
    options: [
      "일 때문에 마음이 무거워요",
      "해야 할 일이 버겁게 느껴져요",
      "오늘 있었던 일을 털어놓고 싶어요",
    ],
  },
  {
    id: "relationship",
    options: [
      "관계에서 마음 쓰이는 일이 있어요",
      "누군가의 말이 계속 생각나요",
      "가까운 사람과의 일이 복잡해요",
    ],
  },
  {
    id: "worry",
    options: [
      "걱정되는 일이 머릿속을 맴돌아요",
      "아직 오지 않은 일이 불안해요",
      "기다리는 동안 마음이 복잡해요",
    ],
  },
  {
    id: "feelings",
    options: [
      "지금 제 마음을 알아보고 싶어요",
      "왜 이런 기분인지 잘 모르겠어요",
      "말로 표현하기 어려운 기분이에요",
    ],
  },
  {
    id: "rest",
    options: [
      "잠깐 쉬어가고 싶어요",
      "아무것도 하기 싫은 날이에요",
      "바쁘게 지낸 마음을 돌보고 싶어요",
    ],
  },
  {
    id: "decision",
    options: [
      "결정하기 어려운 일이 있어요",
      "서로 다른 마음 사이에서 고민돼요",
      "제 생각을 차근차근 정리하고 싶어요",
    ],
  },
  {
    id: "connection",
    options: [
      "그냥 누군가와 이야기하고 싶어요",
      "오늘은 제 이야기를 들어주면 좋겠어요",
      "가벼운 이야기부터 나누고 싶어요",
    ],
  },
  {
    id: "good",
    options: [
      "기분 좋은 일을 나누고 싶어요",
      "오늘 저를 웃게 한 일이 있어요",
      "작은 기쁨을 함께 이야기하고 싶어요",
    ],
  },
];
const ticketing: readonly Topic[] = [
  {
    id: "disappointment",
    options: [
      "아쉬운 마음을 털어놓고 싶어요",
      "기대했던 티켓을 못 구해서 아쉬워요",
      "티켓팅 얘기를 누가 들어주면 좋겠어요",
    ],
  },
  {
    id: "lingering",
    options: [
      "놓친 자리가 계속 생각나요",
      "티켓팅하던 순간이 자꾸 떠올라요",
      "티켓팅 때 조금만 빨랐다면 싶어요",
    ],
  },
  {
    id: "next",
    options: [
      "다음 티켓팅이 벌써 걱정돼요",
      "티켓팅에 다시 도전할 마음을 찾고 싶어요",
      "다음 티켓 오픈을 기다리는 게 힘들어요",
    ],
  },
  {
    id: "pause",
    options: [
      "잠깐 다른 생각을 하고 싶어요",
      "지금은 마음을 좀 쉬게 하고 싶어요",
      "티켓팅 생각에서 잠시 벗어나고 싶어요",
    ],
  },
  {
    id: "meaning",
    options: [
      "좋아하는 공연 이야기를 하고 싶어요",
      "공연을 기다렸던 이야기를 하고 싶어요",
      "좋아하는 마음을 편하게 나누고 싶어요",
    ],
  },
];

function score(seed: number, text: string) {
  let value = seed >>> 0;
  for (const char of text)
    value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0;
  return value;
}

/** Variation never creates facts about a visitor; choices remain optional statements. */
export function createStartOptions({
  context,
  seed,
  previous = [],
}: {
  context?: EntryContext;
  seed: number;
  previous?: readonly string[];
}): string[] {
  const pool = context === "ticketing" ? ticketing : everyday;
  const count = context === "ticketing" ? 4 : 5;
  const chosen = [...pool]
    .sort((a, b) => score(seed, a.id) - score(seed, b.id))
    .slice(0, count);
  const options = chosen.map((topic) => {
    const available = topic.options.filter((text) => !previous.includes(text));
    const candidates = available.length ? available : topic.options;
    return [...candidates].sort((a, b) => score(seed, a) - score(seed, b))[0];
  });
  return context === "ticketing" ? [...options, OTHER_TOPIC] : options;
}
