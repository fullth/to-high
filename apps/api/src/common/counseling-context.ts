/** Share the same retained history and older summary across counseling operations. */
export function buildCounselingContext(session: {
  context: string[];
  rollingSummary?: string;
}): string[] {
  return session.rollingSummary?.trim()
    ? [`[이전 대화 요약] ${session.rollingSummary}`, ...session.context]
    : [...session.context];
}
