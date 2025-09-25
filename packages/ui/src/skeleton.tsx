import * as React from "react";
import { cn } from "./utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return (
    <div
      className={cn("animate-pulse rounded bg-muted", className)}
      {...props}
    />
  );
};

const SkeletonRow = ({ className, ...props }: SkeletonProps) => {
  return (
    <Skeleton
      className={cn("h-9 w-full", className)}
      {...props}
    />
  );
};

const SkeletonCard = ({ className, ...props }: SkeletonProps) => {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-enterprise-sm",
        className
      )}
      {...props}
    >
      <Skeleton className="h-4 w-1/4 mb-2" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  );
};

export { Skeleton, SkeletonRow, SkeletonCard };
