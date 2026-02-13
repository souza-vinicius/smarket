import * as React from "react";

import { cn } from "@/lib/utils";

// Main Card Component
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined" | "ghost";
  padding?: "none" | "sm" | "md" | "lg";
  isInteractive?: boolean;
  isPressable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = "default",
      padding = "md",
      isInteractive = false,
      isPressable = false,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      default: "bg-card border border-border shadow-sm",
      elevated: "bg-card border border-border shadow-lg",
      outlined: "bg-transparent border-2 border-border",
      ghost: "bg-muted/50 border-transparent",
    };

    const paddings = {
      none: "",
      sm: "p-3",
      md: "p-3 sm:p-5",
      lg: "p-4 sm:p-6",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden rounded-xl",
          variants[variant],
          paddings[padding],
          isInteractive && "transition-shadow duration-200 hover:shadow-md",
          isPressable && "cursor-pointer transition-transform duration-100 active:scale-[0.99]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

// Card Header
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  action?: React.ReactNode;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, action, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "mb-4 flex items-start justify-between gap-4",
        className
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
);

CardHeader.displayName = "CardHeader";

// Card Title
const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "line-clamp-2 text-lg font-semibold leading-tight text-foreground",
      className
    )}
    {...props}
  >
    {children}
  </h3>
));

CardTitle.displayName = "CardTitle";

// Card Description
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "mt-1 line-clamp-2 text-sm text-muted-foreground",
      className
    )}
    {...props}
  />
));

CardDescription.displayName = "CardDescription";

// Card Content
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));

CardContent.displayName = "CardContent";

// Card Footer
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "mt-4 flex items-center justify-between gap-4 border-t border-border pt-4",
      className
    )}
    {...props}
  />
));

CardFooter.displayName = "CardFooter";

// Stat Card - For dashboard metrics
interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, title, value, subtitle, icon, trend, isLoading, ...props }, ref) => {
    if (isLoading) {
      return (
        <Card className={className} ref={ref} {...props}>
          <div className="animate-pulse">
            <div className="mb-3 h-4 w-24 rounded bg-muted" />
            <div className="mb-2 h-8 w-32 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
        </Card>
      );
    }

    return (
      <Card
        className={cn("relative overflow-hidden", className)}
        ref={ref}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-medium text-muted-foreground sm:text-sm">
              {title}
            </p>
            <p className="text-xl font-bold tracking-tight text-foreground sm:text-3xl">
              {value}
            </p>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
            {trend && (
              <div className={cn(
                "mt-2 inline-flex items-center gap-1 text-sm font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}>
                <svg
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {trend.isPositive ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  )}
                </svg>
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>
          {icon && (
            <div className="ml-2 flex-shrink-0 sm:ml-4">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary-subtle text-primary sm:size-12">
                {icon}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }
);

StatCard.displayName = "StatCard";

// Info Card - For displaying information with icon
interface InfoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  variant?: "info" | "success" | "warning" | "error";
}

const InfoCard = React.forwardRef<HTMLDivElement, InfoCardProps>(
  ({ className, icon, title, description, variant = "info", ...props }, ref) => {
    const variants = {
      info: {
        bg: "bg-info-subtle",
        text: "text-info",
        border: "border-info/20",
      },
      success: {
        bg: "bg-success-subtle",
        text: "text-success",
        border: "border-success/20",
      },
      warning: {
        bg: "bg-warning-subtle",
        text: "text-warning",
        border: "border-warning/20",
      },
      error: {
        bg: "bg-destructive-subtle",
        text: "text-destructive",
        border: "border-destructive/20",
      },
    };

    const style = variants[variant];

    return (
      <div
        ref={ref}
        className={cn(
          "flex gap-4 rounded-xl border p-4",
          style.bg,
          style.border,
          className
        )}
        {...props}
      >
        {icon && (
          <div className={cn("flex-shrink-0", style.text)}>
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium", style.text)}>{title}</p>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    );
  }
);

InfoCard.displayName = "InfoCard";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  StatCard,
  InfoCard,
};
