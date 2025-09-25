import * as React from "react";
import { cn } from "./utils";

interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
}

const KpiCard = ({ className, label, value, delta, trend = "neutral", ...props }: KpiCardProps) => {
  const getDeltaColor = React.useCallback(() => {
    if (trend === "up") return "text-success";
    if (trend === "down") return "text-danger";
    return "text-muted-foreground";
  }, [trend]);

  const getDeltaIcon = React.useCallback(() => {
    if (trend === "up") return "↗";
    if (trend === "down") return "↘";
    return "";
  }, [trend]);

  return (
    <div
      className={cn(
        "rounded-2xl bg-card text-card-foreground border border-border p-4 shadow-enterprise-sm",
        className
      )}
      {...props}
    >
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {delta && (
          <span className={cn("text-sm font-medium", getDeltaColor())}>
            {getDeltaIcon()} {delta}
          </span>
        )}
      </div>
    </div>
  );
};

KpiCard.displayName = "KpiCard";

export { KpiCard };
