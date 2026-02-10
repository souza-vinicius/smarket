import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "secondary" | "success" | "warning" | "destructive" | "outline";
  size?: "sm" | "md";
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "sm", dot = false, children, ...props }, ref) => {
    const variants = {
      default: "bg-muted text-muted-foreground",
      primary: "bg-primary-subtle text-primary border border-primary/20",
      secondary: "bg-secondary text-secondary-foreground",
      success: "bg-success-subtle text-success border border-success/20",
      warning: "bg-warning-subtle text-warning border border-warning/20",
      destructive: "bg-destructive-subtle text-destructive border border-destructive/20",
      outline: "bg-transparent border border-border text-foreground",
    };

    const sizes = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-2.5 py-1 text-sm",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span className={cn(
            "w-1.5 h-1.5 rounded-full",
            variant === "default" && "bg-muted-foreground",
            variant === "primary" && "bg-primary",
            variant === "success" && "bg-success",
            variant === "warning" && "bg-warning",
            variant === "destructive" && "bg-destructive",
            variant === "outline" && "bg-foreground",
          )} />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

// Status Badge - For showing status with dot
interface StatusBadgeProps extends Omit<BadgeProps, "dot" | "variant"> {
  status: "pending" | "processing" | "extracted" | "completed" | "error" | "cancelled";
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, className, ...props }, ref) => {
    const statusConfig = {
      pending: { variant: "warning" as const, label: "Pendente" },
      processing: { variant: "primary" as const, label: "Processando" },
      extracted: { variant: "success" as const, label: "Extraído" },
      completed: { variant: "success" as const, label: "Concluído" },
      error: { variant: "destructive" as const, label: "Erro" },
      cancelled: { variant: "outline" as const, label: "Cancelado" },
    };

    const config = statusConfig[status];

    return (
      <Badge
        ref={ref}
        variant={config.variant}
        dot
        className={className}
        {...props}
      >
        {config.label}
      </Badge>
    );
  }
);

StatusBadge.displayName = "StatusBadge";

// Count Badge - For showing numbers (notifications, counts)
interface CountBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  count: number;
  max?: number;
  variant?: "default" | "primary" | "destructive";
  size?: "sm" | "md";
}

const CountBadge = React.forwardRef<HTMLSpanElement, CountBadgeProps>(
  ({ count, max = 99, variant = "primary", size = "sm", className, ...props }, ref) => {
    const displayCount = count > max ? `${max}+` : count;

    const variants = {
      default: "bg-muted text-muted-foreground",
      primary: "bg-primary text-primary-foreground",
      destructive: "bg-destructive text-destructive-foreground",
    };

    const sizes = {
      sm: "min-w-[1.25rem] h-5 text-xs",
      md: "min-w-[1.5rem] h-6 text-sm",
    };

    if (count <= 0) return null;

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center px-1 rounded-full font-bold",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {displayCount}
      </span>
    );
  }
);

CountBadge.displayName = "CountBadge";

export { Badge, StatusBadge, CountBadge };
