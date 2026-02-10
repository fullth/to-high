"use client";

interface ContactSidebarProps {
  email?: string;
}

export function ContactSidebar({ email = "xoghksdla@gmail.com" }: ContactSidebarProps) {
  const contactItems = [
    {
      id: "email",
      label: "문의하기",
      href: `mailto:${email}?subject=[To High; 위로] 문의드립니다`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      ),
    },
    {
      id: "feature",
      label: "기능 요청",
      href: `mailto:${email}?subject=[To High; 위로] 기능 요청`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
        </svg>
      ),
    },
    {
      id: "ad",
      label: "광고 문의",
      href: `mailto:${email}?subject=[To High; 위로] 광고/제휴 문의`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
          <path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-40">
      <div className="flex flex-col gap-2 p-2 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg">
        {contactItems.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className="group flex items-center gap-2 p-2.5 rounded-xl hover:bg-primary/10 transition-all duration-200"
            title={item.label}
          >
            <span className="text-muted-foreground group-hover:text-primary transition-colors">
              {item.icon}
            </span>
            <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors whitespace-nowrap opacity-0 group-hover:opacity-100 max-w-0 group-hover:max-w-[100px] overflow-hidden transition-all duration-200">
              {item.label}
            </span>
          </a>
        ))}
      </div>
    </aside>
  );
}
