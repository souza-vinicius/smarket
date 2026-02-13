import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "card" | "text" | "circle" | "avatar";
  lines?: number;
}

function Skeleton({
  className,
  variant = "default",
  lines = 1,
  ...props
}: SkeletonProps) {
  const baseStyles = "animate-pulse bg-muted rounded-md";

  if (variant === "text") {
    return (
      <div className={cn("space-y-2", className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              baseStyles,
              "h-4 w-full",
              i === lines - 1 && lines > 1 && "w-3/4"
            )}
          />
        ))}
      </div>
    );
  }

  const variants = {
    default: "",
    card: "h-32 w-full rounded-xl",
    circle: "rounded-full",
    avatar: "h-10 w-10 rounded-full",
  };

  return (
    <div
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    />
  );
}

// Skeleton Card - For loading states in lists/grids
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-center gap-4">
        <Skeleton variant="avatar" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

// Skeleton Stat Card
function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton variant="avatar" className="size-12" />
      </div>
    </div>
  );
}

// Skeleton List Item
function SkeletonListItem({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 py-3", className)}>
      <Skeleton variant="avatar" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

// Skeleton Table Row
function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-3">
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex-1",
            i === 0 && "flex-[2]"
          )}
        >
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonStatCard, SkeletonListItem, SkeletonTableRow };
