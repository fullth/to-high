import Image from "next/image";
import motion from "./character-presence.module.css";
const visuals = ["idle", "listening", "thinking", "responding"] as const;
const sources = {
  idle: "/characters/levi.png",
  listening: "/characters/levi-listening.png",
  thinking: "/characters/levi-thinking.png",
  responding: "/characters/levi-responding.png",
};
export type PresenceState =
  | "idle"
  | "listening"
  | "thinking"
  | "arrived"
  | "error"
  | "ended";
const labels: Record<PresenceState, string> = {
  idle: "편한 말이나 선택지로 시작해 주세요.",
  listening: "마음을 적고 있어요. 준비되면 보내 주세요.",
  thinking: "답변을 준비하고 있어요...",
  arrived: "답변이 도착했어요.",
  error: "다시 입력하거나 상담을 마칠 수 있어요.",
  ended: "상담을 마쳤어요. 대화 원문을 지웠어요.",
};
export function CharacterPresence({
  name,
  state,
}: {
  name: string;
  state: PresenceState;
}) {
  const visual =
    state === "listening" || state === "thinking"
      ? state
      : state === "arrived"
        ? "responding"
        : "idle";
  return (
    <section
      data-character-state={state}
      data-character-visual={visual}
      aria-label="AI 캐릭터 상태"
      className={`flex items-center gap-3 rounded-xl border p-3 bg-card ${state === "arrived" || state === "thinking" ? "border-primary" : "border-border"}`}
    >
      <div className={motion.canvas}>
        {visuals.map((item) => (
          <Image
            key={item}
            src={sources[item]}
            alt={item === visual ? `${name} AI 캐릭터` : ""}
            aria-hidden={item !== visual}
            width={64}
            height={64}
            loading="eager"
            data-visual={item}
            className={`${motion.image} ${item === visual ? `${motion.active} ${motion[item] || ""}` : ""}`}
          />
        ))}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold break-words">{name} · AI 캐릭터</p>
        <p
          role="status"
          aria-atomic="true"
          className="text-sm text-muted-foreground break-words"
        >
          {labels[state]}
        </p>
      </div>
    </section>
  );
}
