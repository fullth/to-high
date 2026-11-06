import { Trash2 } from "lucide-react";
import type { SavedSession } from "@/lib/product-api";

export function SavedSessionList({ sessions, loggedIn, error = "", onOpen, onDelete }: {
  sessions: SavedSession[];
  loggedIn: boolean;
  error?: string;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!loggedIn) return <p className="ch-saved-empty">로그인하면 저장된 대화를 볼 수 있어요.</p>;
  if (error) return <p className="ch-saved-empty" role="alert">{error}</p>;
  if (!sessions.length) return <p className="ch-saved-empty">저장된 상담이 없어요.</p>;
  return <ul className="ch-saved-items">{sessions.map((session) => <li key={session.id} className="ch-saved-item">
    <button className="ch-saved-open" onClick={() => onOpen(session.id)} title={session.title}>{session.title}</button>
    <button className="ch-saved-delete" aria-label={`${session.title} 삭제`} onClick={() => onDelete(session.id)}><Trash2 size={16} aria-hidden="true" /></button>
  </li>)}</ul>;
}
