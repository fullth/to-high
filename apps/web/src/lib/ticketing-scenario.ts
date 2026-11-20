export type TicketingScenario = {
  source: "practicket" | "lobby";
  kind: "ticketing";
  gender: "male" | "female";
  name: string;
};

export const TICKETING_SCENARIO_TITLE = "시나리오 상담 - 티켓팅 편";
export const TICKETING_CHARACTERS = {
  male: {
    label: "남자",
    defaultName: "서온",
    description: "차분하게 귀 기울이는 싱어송라이터",
    image: "/characters/practicket/male.webp",
  },
  female: {
    label: "여자",
    defaultName: "해린",
    description: "다정하게 마음을 북돋는 싱어송라이터",
    image: "/characters/practicket/female.webp",
  },
} as const;
export function validScenarioName(value: string) {
  const name = value.normalize("NFKC").trim();
  return (
    name.length >= 1 &&
    name.length <= 12 &&
    /^[\p{L}\p{N}][\p{L}\p{N} ]*$/u.test(name)
  );
}
export function scenarioGreeting(gender: TicketingScenario["gender"]) {
  return gender === "male"
    ? "오늘 예매 기다리느라 고생했지. 이번엔 못 만나서 나도 아쉬워. 내 무대를 기다려줘서 고마워. 제일 듣고 싶었던 노래가 뭐였어?"
    : "와 줘서 고마워. 오늘 예매 때문에 마음이 많이 쓰였지? 이번엔 무대에서 못 만나지만, 잠깐 네 이야기를 듣고 싶어. 어떤 노래가 가장 듣고 싶었어?";
}
export const SCENARIO_FALLBACK_OPTIONS = [
  "듣고 싶었던 무대가 있어",
  "아직 아쉬운 마음이 커",
  "다음 무대 이야기가 궁금해",
  "잠깐 다른 이야기를 하고 싶어",
];
