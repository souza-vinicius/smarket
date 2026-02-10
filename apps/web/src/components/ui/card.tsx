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
      md: "p-4 sm:p-5",
      lg: "p-5 sm:p-6",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl overflow-hidden",
          variants[variant],
          paddings[padding],
          isInteractive && "hover:shadow-md transition-shadow duration-200",
          isPressable && "cursor-pointer active:scale-[0.99] transition-transform duration-100",
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
        "flex items-start justify-between gap-4 mb-4",
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0">{children}</div>
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
      "text-lg font-semibold text-foreground leading-tight line-clamp-2",
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
      "text-sm text-muted-foreground mt-1 line-clamp-2",
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
      "flex items-center justify-between gap-4 mt-4 pt-4 border-t border-border",
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
            <div className="h-4 w-24 bg-muted rounded mb-3" />
            <div className="h-8 w-32 bg-muted rounded mb-2" />
            <div className="h-3 w-20 bg-muted rounded" />
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
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
            {trend && (
              <div className={cn(
                "inline-flex items-center gap-1 mt-2 text-sm font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}>
                <svg 
                  className="w-4 h-4" 
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
            <div className="flex-shrink-0 ml-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-subtle text-primary">
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
          "flex gap-4 p-4 rounded-xl border",
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
        <div className="flex-1 min-w-0">
          <p className={cn("font-medium", style.text)}>{title}</p>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
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
