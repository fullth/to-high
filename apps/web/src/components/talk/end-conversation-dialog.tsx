"use client";

import { useEffect, useRef } from "react";

export function EndConversationDialog({ hasMessages, loggedIn, busy, error, onDelete, onSave, onClose }: {
  hasMessages: boolean; loggedIn: boolean; busy: boolean; error: string;
  onDelete: () => void; onSave: () => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="ch-limit-dialog" aria-labelledby="end-conversation-title" onClose={onClose}>
    <div className="ch-limit-dialog-content">
      <h2 id="end-conversation-title">상담을 마칠까요?</h2>
      <p>대화 내용을 지우거나 저장해 나중에 다시 볼 수 있어요.</p>
      {!loggedIn && <p>저장하려면 Google 로그인이 필요해요. 로그인하는 동안 이 브라우저에 대화를 잠시 보관해요.</p>}
      <p>저장하면 대화 내용과 요약한 제목이 계정에 보관돼요. 저장한 대화는 직접 삭제할 수 있어요.</p>
      {error && <p role="alert">{error}</p>}
      <div className="ch-limit-dialog-actions">
        <button className="ch-limit-dialog-primary" onClick={onSave} disabled={!hasMessages || busy}>{busy ? "저장 중이에요" : "저장하기"}</button>
        <button className="ch-ghostbtn" onClick={onDelete} disabled={busy}>대화 내용 지우기</button>
        <button className="ch-ghostbtn" onClick={() => dialog.current?.close()} disabled={busy}>계속 대화하기</button>
      </div>
    </div>
  </dialog>;
}

export function ConfirmSavedAction({ message, onConfirm, onClose }: { message: string; onConfirm: () => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="ch-limit-dialog" aria-labelledby="saved-confirm-title" onClose={onClose}>
    <div className="ch-limit-dialog-content">
      <h2 id="saved-confirm-title">확인해 주세요</h2><p>{message}</p>
      <div className="ch-limit-dialog-actions"><button className="ch-limit-dialog-primary" onClick={onConfirm}>확인</button><button className="ch-ghostbtn" onClick={() => dialog.current?.close()}>취소</button></div>
    </div>
  </dialog>;
}
