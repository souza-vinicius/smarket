"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CountBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  badge?: number;
}

interface MobileNavProps {
  items: NavItem[];
  className?: string;
}

export function MobileNav({ items, className }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-50",
        "bg-background-elevated/95 backdrop-blur-lg",
        "border-t border-border",
        "pb-safe",
        "lg:hidden",
        className
      )}
    >
      <div className="flex h-16 items-center justify-around">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-full flex-1 flex-col items-center justify-center",
                "min-w-[64px] max-w-[96px]",
                "transition-colors duration-200",
                "relative",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <span className={cn(
                  "block transition-transform duration-200",
                  isActive && "scale-110"
                )}>
                  {isActive && item.activeIcon ? item.activeIcon : item.icon}
                </span>
                {item.badge && item.badge > 0 && (
                  <span className="absolute -right-1 -top-1">
                    <CountBadge count={item.badge} />
                  </span>
                )}
              </div>
              <span className={cn(
                "mt-1 text-[10px] font-medium",
                "transition-all duration-200",
                isActive ? "opacity-100" : "opacity-70"
              )}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-0 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Floating Action Button for mobile
interface FloatingActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
  variant?: "primary" | "secondary";
}

export function FloatingActionButton({
  icon,
  label,
  onClick,
  className,
  variant = "primary",
}: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "fixed bottom-20 right-4 z-40",
        "lg:hidden",
        "flex items-center gap-2",
        "h-14 rounded-full px-4",
        "shadow-lg shadow-primary/25",
        "transition-all duration-200",
        "active:scale-95",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary-hover",
        variant === "secondary" && "bg-foreground text-background hover:bg-foreground/90",
        className
      )}
    >
      <span className="size-5">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}
