import React from "react";
import { Card } from "./ui";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  format?: "currency" | "percentage" | "number";
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-accent",
  trend,
  format = "number",
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === "string") return val;

    switch (format) {
      case "currency":
        return new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: "MXN",
        }).format(val);
      case "percentage":
        return `${val.toFixed(2)}%`;
      default:
        return val.toLocaleString("es-MX");
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-text-secondary text-sm mb-1">{title}</p>
          <p className="text-2xl font-bold text-text">{formatValue(value)}</p>
          {subtitle && (
            <p className="text-xs text-text-secondary mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 bg-opacity-10 rounded-lg ${iconColor}`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        )}
      </div>

      {trend && (
        <div className="flex items-center space-x-2 pt-3 border-t border-border">
          <div
            className={`flex items-center space-x-1 text-sm ${
              trend.isPositive ? "text-success" : "text-error"
            }`}
          >
            <span>{trend.isPositive ? "↑" : "↓"}</span>
            <span>{Math.abs(trend.value).toFixed(1)}%</span>
          </div>
          <span className="text-xs text-text-secondary">vs. periodo anterior</span>
        </div>
      )}
    </Card>
  );
};
