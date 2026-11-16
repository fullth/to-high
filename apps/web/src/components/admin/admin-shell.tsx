"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Coins,
  History,
  LayoutDashboard,
} from "lucide-react";
import { FullPageLink } from "@/components/full-page-link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import "@/components/ui/system.css";

const sections = [
  { id: "#overview", title: "운영 개요", icon: LayoutDashboard },
  { id: "#usage", title: "이용 통계", icon: BarChart3 },
  { id: "#budget", title: "AI 예산", icon: Coins },
  { id: "#approvals", title: "승인 내역", icon: History },
];

function AdminSidebar() {
  const { setOpenMobile } = useSidebar();
  const [active, setActive] = useState("#overview");
  useEffect(() => {
    const sync = () => setActive(window.location.hash || "#overview");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <FullPageLink href="/">
                <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Activity className="size-4" />
                </span>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="font-semibold">위로</span>
                  <span className="text-xs text-muted-foreground">
                    서비스 관리
                  </span>
                </span>
              </FullPageLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarTrigger className="ml-auto md:hidden" aria-label="메뉴 닫기" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>운영</SidebarGroupLabel>
          <SidebarMenu>
            {sections.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  asChild
                  isActive={active === item.id}
                  tooltip={item.title}
                >
                  <a
                    href={item.id}
                    aria-current={active === item.id ? "location" : undefined}
                    onClick={() => {
                      setActive(item.id);
                      setOpenMobile(false);
                    }}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Google Analytics">
              <a
                href="https://analytics.google.com/analytics/web/#/a399568760p543674918/reports/intelligenthome"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ArrowUpRight />
                <span>Google Analytics</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="admin-theme">
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset className="min-w-0">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 lg:px-6">
            <SidebarTrigger aria-label="관리자 메뉴 전환" className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-sm text-muted-foreground">관리자</span>
            <span className="text-sm text-muted-foreground" aria-hidden="true">
              /
            </span>
            <span className="text-sm font-medium">운영 대시보드</span>
          </header>
          <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
