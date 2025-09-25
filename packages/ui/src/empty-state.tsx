import * as React from "react";
import { cn } from "./utils";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

const EmptyState = ({ className, title, description, action, icon, ...props }: EmptyStateProps) => {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border p-10 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export { EmptyState };
