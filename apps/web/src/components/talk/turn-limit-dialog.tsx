"use client";

import { useEffect, useRef } from "react";

export function TurnLimitDialog({ message, guest, onClose, onLogin }: {
  message: string;
  guest: boolean;
  onClose: () => void;
  onLogin: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog ref={dialog} className="ch-limit-dialog" aria-labelledby="turn-limit-title" onClose={onClose}>
      <div className="ch-limit-dialog-content">
        <p className="ch-limit-dialog-kicker">잠시 쉬어가는 시간</p>
        <h2 id="turn-limit-title">{guest ? "무료 대화 한도에 도달했어요" : "오늘의 대화를 모두 나눴어요"}</h2>
        <p>{message}</p>
        <p>당장 위험하거나 다쳤다면 <a className="ch-help-link" href="tel:119">119</a>, 자살 관련 위기 상담은 <a className="ch-help-link" href="tel:109">109</a>에 전화해 주세요.</p>
        <div className="ch-limit-dialog-actions">
          {guest && <button className="ch-limit-dialog-primary" onClick={onLogin}>로그인하기</button>}
          <button className="ch-ghostbtn" onClick={() => dialog.current?.close()}>확인</button>
        </div>
      </div>
    </dialog>
  );
}
