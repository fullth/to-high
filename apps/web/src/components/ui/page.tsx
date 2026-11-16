import type { ComponentProps, ReactNode } from "react";
import { BarChart3, Info } from "lucide-react";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import { Badge as ShadcnBadge } from "./badge";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { cn } from "@/lib/utils";

/** Page composition only; geometry and controls come from shadcn/ui. */
export function PageShell({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-6">{children}</div>;
}
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
export function Panel({
  children,
  className,
  ...props
}: ComponentProps<"section">) {
  return (
    <Card asChild className={cn("gap-0 py-0", className)}>
      <section {...props}>{children}</section>
    </Card>
  );
}
export function PanelHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <CardHeader className="ui-panel-header py-5">
      <CardTitle>
        <h2>{title}</h2>
      </CardTitle>
      {description && (
        <CardDescription className="text-xs">{description}</CardDescription>
      )}
      {actions && <CardAction>{actions}</CardAction>}
    </CardHeader>
  );
}
export function MetricCard({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: ReactNode;
  note?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="gap-2 px-4 py-5 lg:px-6">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </dd>
      {note && <dd className="text-xs text-muted-foreground">{note}</dd>}
    </Card>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <ShadcnBadge
      variant="secondary"
      className={cn(
        "font-medium",
        tone === "success" && "bg-emerald-50 text-emerald-800",
        tone === "warning" && "bg-amber-50 text-amber-900",
        tone === "danger" && "bg-red-50 text-red-800",
      )}
    >
      {children}
    </ShadcnBadge>
  );
}
export function Notice({
  title,
  children,
  tone = "neutral",
}: {
  title?: string;
  children?: ReactNode;
  tone?: "neutral" | "warning" | "danger";
}) {
  return (
    <Alert
      role={tone === "neutral" ? "status" : "alert"}
      variant={tone === "danger" ? "destructive" : "default"}
      className={cn(
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-900",
        tone === "danger" && "bg-red-50",
      )}
    >
      <Info aria-hidden="true" />
      {title && <AlertTitle>{title}</AlertTitle>}
      {children && (
        <AlertDescription className="text-inherit">{children}</AlertDescription>
      )}
    </Alert>
  );
}
export function EmptyState({
  title,
  children,
  compact = false,
}: {
  title: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 px-6 py-10 text-center",
        compact && "items-start border-t py-5 text-left",
      )}
    >
      {!compact && (
        <BarChart3
          className="mb-2 size-6 text-muted-foreground"
          aria-hidden="true"
        />
      )}
      <p className="text-sm font-medium">{title}</p>
      {children && (
        <p className="max-w-md text-sm text-muted-foreground">{children}</p>
      )}
    </div>
  );
}
export function HelpDetails({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="border-t px-6 py-4">
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
        {title}
      </summary>
      <div className="mt-3 grid gap-2 text-xs leading-relaxed text-muted-foreground">
        {children}
      </div>
    </details>
  );
}
