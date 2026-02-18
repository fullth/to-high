"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  InquiryType,
  InquiryMessage,
  createInquiry,
  addInquiryMessage,
  getInquiries,
  Inquiry,
} from "@/lib/api";

const inquiryTypes: { id: InquiryType; label: string; description: string }[] = [
  {
    id: "contact",
    label: "버그 신고",
    description: "오류나 문제를 알려주세요",
  },
  {
    id: "feature",
    label: "기능 요청",
    description: "원하시는 기능을 알려주세요",
  },
  {
    id: "ad",
    label: "광고 문의",
    description: "광고/제휴 관련 문의",
  },
];

const typeLabels: Record<InquiryType, string> = {
  contact: "버그 신고",
  feature: "기능 요청",
  ad: "광고 문의",
};

export function ContactSidebar() {
  const { user, token, login } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [openChat, setOpenChat] = useState<InquiryType | null>(null);
  const [messages, setMessages] = useState<InquiryMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [inquiryId, setInquiryId] = useState<string | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [showList, setShowList] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpenModal = () => {
    if (!user || !token) {
      login();
      return;
    }
    setShowModal(true);
    setOpenChat(null);
    setShowList(false);
    setSelectedInquiry(null);
  };

  const handleSelectType = (type: InquiryType) => {
    setOpenChat(type);
    setMessages([]);
    setInquiryId(null);
    setInput("");
    setSelectedInquiry(null);
    setShowList(false);
  };

  const handleShowList = async () => {
    if (!token) return;
    try {
      const list = await getInquiries(token);
      setInquiries(list);
      setShowList(true);
      setOpenChat(null);
      setSelectedInquiry(null);
    } catch {
      // ignore
    }
  };

  const handleSelectInquiry = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setMessages(inquiry.messages);
    setInquiryId(inquiry._id);
    setOpenChat(inquiry.type);
    setShowList(false);
  };

  const handleSend = async () => {
    if (!input.trim() || !token || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);

    const userMsg: InquiryMessage = { role: "user", content, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      if (!inquiryId) {
        const result = await createInquiry(openChat!, content, token);
        setInquiryId(result.inquiryId);
      } else {
        await addInquiryMessage(inquiryId, content, token);
      }
    } catch {
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const handleBack = () => {
    setOpenChat(null);
    setMessages([]);
    setInquiryId(null);
    setInput("");
    setShowList(false);
    setSelectedInquiry(null);
  };

  const handleClose = () => {
    setShowModal(false);
    setOpenChat(null);
    setMessages([]);
    setInquiryId(null);
    setInput("");
    setShowList(false);
    setSelectedInquiry(null);
  };

  // 유형 선택 화면인지 (모달은 열려있지만 채팅/목록은 아닌 상태)
  const showTypeSelector = showModal && !openChat && !showList;

  return (
    <>
      {/* 사이드 버튼 - 하나만 */}
      <aside className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-40">
        <div className="flex flex-col gap-2 p-2 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg">
          <button
            onClick={handleOpenModal}
            className="group flex items-center gap-2 p-2.5 rounded-xl hover:bg-primary/10 transition-all duration-200"
            title="문의하기"
          >
            <span className="text-muted-foreground group-hover:text-primary transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors whitespace-nowrap opacity-0 group-hover:opacity-100 max-w-0 group-hover:max-w-[100px] overflow-hidden transition-all duration-200">
              문의하기
            </span>
          </button>
        </div>
      </aside>

      {/* 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 bg-card rounded-2xl border border-border shadow-2xl flex flex-col max-h-[80vh]">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                {(openChat || showList) && (
                  <button
                    onClick={handleBack}
                    className="p-1 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                )}
                <h3 className="font-semibold text-sm">
                  {showList
                    ? "이전 문의 내역"
                    : openChat
                      ? typeLabels[openChat]
                      : "문의하기"}
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="p-1 rounded-lg hover:bg-secondary transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {/* 유형 선택 화면 */}
            {showTypeSelector && (
              <div className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground text-center mb-2">
                  어떤 유형의 문의인가요?
                </p>
                {inquiryTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleSelectType(type.id)}
                    className="w-full text-left p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    <p className="text-sm font-medium text-foreground">{type.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                  </button>
                ))}
                {/* 이전 문의 보기 */}
                <button
                  onClick={handleShowList}
                  className="w-full text-center p-3 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  이전 문의 내역 보기
                </button>
              </div>
            )}

            {/* 문의 목록 */}
            {showList && (
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {inquiries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    아직 문의 내역이 없습니다.
                  </p>
                ) : (
                  inquiries.map((inquiry) => (
                    <button
                      key={inquiry._id}
                      onClick={() => handleSelectInquiry(inquiry)}
                      className="w-full text-left p-3 rounded-xl border border-border hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-primary">
                          {typeLabels[inquiry.type]}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          inquiry.status === "open"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}>
                          {inquiry.status === "open" ? "진행중" : "종료"}
                        </span>
                      </div>
                      <p className="text-sm text-foreground truncate">
                        {inquiry.messages[0]?.content || ""}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(inquiry.createdAt).toLocaleDateString("ko-KR")}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* 채팅 영역 */}
            {openChat && !showList && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">
                        {openChat === "contact" && "발견하신 오류나 문제를 알려주세요."}
                        {openChat === "feature" && "원하시는 기능을 알려주세요."}
                        {openChat === "ad" && "광고/제휴 문의 내용을 입력해주세요."}
                      </p>
                    </div>
                  )}
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-secondary text-foreground rounded-bl-md"
                        }`}
                      >
                        {msg.role === "admin" && (
                          <p className="text-xs font-medium text-primary mb-1">관리자</p>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${
                          msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                        }`}>
                          {new Date(msg.createdAt).toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* 입력 영역 */}
                {(selectedInquiry?.status !== "closed") && (
                  <div className="px-4 pb-4 pt-2 border-t border-border">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder="메시지를 입력하세요..."
                        className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        disabled={sending}
                      />
                      <button
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                        className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                      >
                        {sending ? (
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                            <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="m22 2-7 20-4-9-9-4z" />
                            <path d="M22 2 11 13" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
