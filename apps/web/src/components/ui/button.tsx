import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // Base styles - mobile-first with minimum touch targets
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";
    
    // Variant styles
    const variants = {
      primary: 
        "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm hover:shadow-md",
      secondary: 
        "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      outline: 
        "border-2 border-border bg-transparent hover:bg-secondary hover:border-border-strong",
      ghost: 
        "hover:bg-secondary hover:text-secondary-foreground",
      danger: 
        "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
      success: 
        "bg-success text-success-foreground hover:bg-success/90 shadow-sm",
    };
    
    // Size styles - all meeting minimum touch target (44px)
    const sizes = {
      sm: "h-10 px-3 text-sm rounded-lg gap-1.5", // 40px height - slightly smaller but still good
      md: "h-11 px-4 text-base rounded-lg gap-2", // 44px height - minimum touch target
      lg: "h-12 px-6 text-base rounded-xl gap-2", // 48px height - recommended touch target
      icon: "h-11 w-11 rounded-lg", // Square button for icons
    };
    
    // Icon sizing
    const iconSizes = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-5 h-5",
      icon: "w-5 h-5",
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className={cn("animate-spin", iconSizes[size])}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && leftIcon && (
          <span className={iconSizes[size]}>{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && (
          <span className={iconSizes[size]}>{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

// Icon Button variant - for actions with icons only
interface IconButtonProps extends Omit<ButtonProps, "leftIcon" | "rightIcon" | "size"> {
  icon: React.ReactNode;
  size?: "sm" | "md" | "lg";
  label: string; // For accessibility
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = "md", label, className, ...props }, ref) => {
    const sizes = {
      sm: "h-10 w-10",
      md: "h-11 w-11",
      lg: "h-12 w-12",
    };
    
    const iconSizes = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6",
    };

    return (
      <button
        ref={ref}
        aria-label={label}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          "bg-transparent hover:bg-secondary text-foreground",
          sizes[size],
          className
        )}
        {...props}
      >
        <span className={iconSizes[size]}>{icon}</span>
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

export { Button, IconButton };
export type { ButtonProps, IconButtonProps };
