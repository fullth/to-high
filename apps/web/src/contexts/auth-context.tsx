"use client";

import { getMe, User } from "@/lib/api";
import { createContext, ReactNode, useContext, useEffect, useState, useRef } from "react";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: () => void;
  loginWithKakao: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const storedToken = localStorage.getItem("accessToken");
    if (storedToken) {
      getMe(storedToken)
        .then((userData) => {
          setToken(storedToken);
          setUser(userData);
        })
        .catch(() => {
          localStorage.removeItem("accessToken");
        })
        .finally(() => setIsLoading(false));
    } else {
      // 비동기적으로 상태 업데이트 (queueMicrotask 사용)
      queueMicrotask(() => setIsLoading(false));
    }
  }, []);

  const login = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    window.location.href = `${apiUrl}/auth/google`;
  };

  const loginWithKakao = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    window.location.href = `${apiUrl}/auth/kakao`;
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, loginWithKakao, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
