"use client";

import { ChatDialog } from "./chat-dialog";

export function EndConversationDialog({ hasMessages, loggedIn, busy, error, onDelete, onSave, onClose }: {
  hasMessages: boolean; loggedIn: boolean; busy: boolean; error: string;
  onDelete: () => void; onSave: () => void; onClose: () => void;
}) {
  return <ChatDialog title="상담을 마칠까요?" busy={busy} onClose={onClose} actions={<>
    <button className="ch-limit-dialog-primary" onClick={onSave} disabled={!hasMessages || busy}>{busy ? "저장 중이에요" : "저장하기"}</button>
    <button className="ch-ghostbtn" onClick={onDelete} disabled={busy}>대화 내용 지우기</button>
    <button className="ch-ghostbtn" onClick={onClose} disabled={busy}>계속 대화하기</button>
  </>}>
    <p>대화 내용을 지우거나 저장해 나중에 다시 볼 수 있어요.</p>
    {!loggedIn && <p>저장하려면 Google 로그인이 필요해요. 로그인하는 동안 이 브라우저에 대화를 잠시 보관해요.</p>}
    <p>저장하면 대화 내용과 요약한 제목이 계정에 보관돼요. 저장한 대화는 직접 삭제할 수 있어요.</p>
    {error && <p role="alert">{error}</p>}
  </ChatDialog>;
}

export function ConfirmSavedAction({ message, onConfirm, onClose }: { message: string; onConfirm: () => void; onClose: () => void }) {
  return <ChatDialog title="확인해 주세요" onClose={onClose} actions={<>
    <button className="ch-limit-dialog-primary" onClick={onConfirm}>확인</button>
    <button className="ch-ghostbtn" onClick={onClose}>취소</button>
  </>}><p>{message}</p></ChatDialog>;
}
