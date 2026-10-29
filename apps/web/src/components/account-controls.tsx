"use client";

import { useAuth } from "@/contexts/auth-context";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface AccountControlsProps {
  variant?: "default" | "landing" | "chat";
}

export function AccountControls({
  variant = "default",
}: AccountControlsProps) {
  const { user, token, isLoading, login, loginWithKakao, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (isLoading) return null;

  if (!token) {
    return (
      <div className="account-menu" ref={menuRef}>
        <button
          type="button"
          className={
            variant === "landing"
              ? "btn btn-ghost btn-sm"
              : variant === "chat"
                ? "ch-ghostbtn"
                : "account-login"
          }
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          로그인
        </button>
        {open && (
          <div
            className="login-provider-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <section
              className="login-provider-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="login-provider-title"
            >
              <button
                type="button"
                className="login-provider-close"
                aria-label="로그인 선택 닫기"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
              <div className="login-provider-mark" aria-hidden="true">
                <Image src="/characters/levi.png" alt="" width={50} height={50} />
              </div>
              <h2 id="login-provider-title">레비와 대화를 시작해요</h2>
              <p>사용할 로그인 방법을 선택해 주세요.</p>
              <div className="login-provider-actions">
                <button
                  type="button"
                  className="login-provider-button google"
                  onClick={() => {
                    setOpen(false);
                    login();
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google로 로그인하기
                </button>
                <button
                  type="button"
                  className="login-provider-button kakao"
                  onClick={() => {
                    setOpen(false);
                    loginWithKakao();
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.84 5.18 4.6 6.54-.2.72-.74 2.62-.85 3.02-.13.5.18.49.39.36.16-.1 2.59-1.76 3.64-2.48.73.1 1.48.16 2.22.16 5.52 0 10-3.48 10-7.8S17.52 3 12 3z" />
                  </svg>
                  카카오로 로그인하기
                </button>
              </div>
              <button
                type="button"
                className="login-provider-later"
                onClick={() => setOpen(false)}
              >
                나중에 할게요
              </button>
            </section>
          </div>
        )}
      </div>
    );
  }

  const name = user?.name?.trim() || user?.email?.split("@")[0] || "위로 사용자";

  return (
    <div
      className={`account-controls account-session${open ? " is-open" : ""}`}
      ref={menuRef}
    >
      <button
        type="button"
        className="account-trigger"
        title={user?.email || name}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="account-avatar" aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="account-copy">
          <strong>{name}</strong>
          {user?.email && <span>{user.email}</span>}
        </span>
      </button>
      {open && (
        <div className="account-popover" role="menu">
          <div className="account-popover-identity" role="presentation">
            <strong>{name}</strong>
            {user?.email && <span>{user.email}</span>}
          </div>
          <button
            type="button"
            className="account-popover-action"
            role="menuitem"
            onClick={logout}
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
