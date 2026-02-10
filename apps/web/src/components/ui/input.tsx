import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { 
      className, 
      label, 
      error, 
      hint, 
      leftIcon, 
      rightIcon,
      isLoading,
      type = "text",
      disabled,
      ...props 
    }, 
    ref
  ) => {
    // Generate unique ID for label association
    const id = React.useId();
    const inputId = props.id || `input-${id}`;
    const hasError = !!error;
    const hasLeftIcon = !!leftIcon;
    const hasRightIcon = !!rightIcon || isLoading;

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {label}
            {props.required && (
              <span className="ml-0.5 text-destructive">*</span>
            )}
          </label>
        )}
        <div className="relative">
          {hasLeftIcon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            disabled={disabled || isLoading}
            className={cn(
              // Base styles - mobile optimized
              "flex w-full rounded-lg border bg-background-elevated px-4 text-foreground",
              "transition-all duration-200",
              // Height - minimum 44px touch target
              "h-11",
              // Typography
              "text-base placeholder:text-muted-foreground",
              // States
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "active:scale-[0.99]",
              // Padding adjustments for icons
              hasLeftIcon && "pl-10",
              hasRightIcon && "pr-10",
              // Error state
              hasError 
                ? "border-destructive focus:border-destructive focus:ring-destructive/20" 
                : "border-border focus:border-primary",
              className
            )}
            ref={ref}
            {...props}
          />
          {hasRightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isLoading ? (
                <svg
                  className="h-5 w-5 animate-spin text-muted-foreground"
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
              ) : (
                <span className="text-muted-foreground">{rightIcon}</span>
              )}
            </div>
          )}
        </div>
        {error ? (
          <p className="mt-1.5 text-sm text-destructive animate-slide-down">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

// Password Input with visibility toggle
interface PasswordInputProps extends Omit<InputProps, "type" | "rightIcon"> {
  showStrength?: boolean;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <Input
        type={showPassword ? "text" : "password"}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        }
        className={className}
        ref={ref}
        {...props}
      />
    );
  }
);

PasswordInput.displayName = "PasswordInput";

// Textarea component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, ...props }, ref) => {
    const id = React.useId();
    const textareaId = props.id || `textarea-${id}`;
    const hasError = !!error;

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {label}
            {props.required && (
              <span className="ml-0.5 text-destructive">*</span>
            )}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            "flex w-full rounded-lg border bg-background-elevated px-4 py-3 text-foreground",
            "transition-all duration-200 min-h-[100px] resize-y",
            "text-base placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            hasError 
              ? "border-destructive focus:border-destructive focus:ring-destructive/20" 
              : "border-border focus:border-primary",
            className
          )}
          ref={ref}
          {...props}
        />
        {error ? (
          <p className="mt-1.5 text-sm text-destructive animate-slide-down">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

// Search Input with clear button
interface SearchInputProps extends Omit<InputProps, "type" | "rightIcon"> {
  onClear?: () => void;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onClear, value, onChange, ...props }, ref) => {
    const hasValue = !!value;

    return (
      <Input
        type="search"
        leftIcon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
        rightIcon={
          hasValue ? (
            <button
              type="button"
              onClick={onClear}
              className="p-0.5 rounded-full hover:bg-muted transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : undefined
        }
        className={cn("[&::-webkit-search-cancel-button]:hidden", className)}
        value={value}
        onChange={onChange}
        ref={ref}
        {...props}
      />
    );
  }
);

SearchInput.displayName = "SearchInput";

export { Input, PasswordInput, Textarea, SearchInput };
