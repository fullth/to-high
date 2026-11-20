"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  kicker?: string;
  children: ReactNode;
  actions: ReactNode;
  busy?: boolean;
  onClose: () => void;
};

export function ChatDialog({ title, kicker, children, actions, busy = false, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    if (element && !element.open) element.showModal();
    return () => {
      if (!element?.isConnected && previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="ch-limit-dialog"
      aria-labelledby={titleId}
      aria-busy={busy}
      onCancel={(event) => { if (busy) event.preventDefault(); }}
      onClose={onClose}
    >
      <div className="ch-limit-dialog-content">
        {kicker && <p className="ch-limit-dialog-kicker">{kicker}</p>}
        <h2 id={titleId}>{title}</h2>
        {children}
        <div className="ch-limit-dialog-actions">{actions}</div>
      </div>
    </dialog>
  );
}
