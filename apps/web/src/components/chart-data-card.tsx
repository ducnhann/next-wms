"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import React, { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useChartStore } from "@/store/chart";

export type ChartDataPoint = {
  label: string;
  value: number;
  /** True if this is a projected/estimated value (not actual data) */
  isProjected?: boolean;
};

export type ChartDataCardProps = {
  /** Card title (e.g., "Total Completed", "Active Orders") */
  title: string;
  /** Current period value to display */
  value: number | string;
  /** Percentage change from previous period (can be negative) */
  changePercent: number;
  /** Whether the change is favorable/good (controls color: green=true, red=false) */
  isPositive?: boolean;
  /** Period label (e.g., "Last 30 Days", "This Week") */
  periodLabel?: string;
  /** Chart data points */
  data: ChartDataPoint[];
  /** Chart color */
  color: string;
  /** Optional class name for the container */
  className?: string;
};

/**
 * A general-purpose data card with a mini chart visualization.
 * Supports projected data with Line mode (single value) or Area mode (min/max range).
 */
export const ChartDataCard = React.memo(function ChartDataCard({
  title,
  value,
  changePercent,
  isPositive = changePercent >= 0,
  periodLabel = "Last 30 days",
  data,
  color,
  className,
}: ChartDataCardProps) {
  const lineType = useChartStore((state) => state.lineType);
  const projectionStyle = useChartStore((state) => state.projectionStyle);

  // Transform data to have separate actual and projected values for dual-area rendering
  const chartData = useMemo(() => {
    // Find the last actual (non-projected) data point index
    let lastActualIndex = -1;
    for (let i = data.length - 1; i >= 0; i--) {
      if (!data[i].isProjected) {
        lastActualIndex = i;
        break;
      }
    }

    // Start projection from n-2 for smoother transition
    const projectionStartIndex = Math.max(0, lastActualIndex - 2);

    return data.map((point, index) => {
      const hasProjectedAfter = lastActualIndex < data.length - 1;
      // Include points from n-2 onwards in the projected line
      const isInProjectionRange =
        hasProjectedAfter && index >= projectionStartIndex;
      const shouldShowProjection = point.isProjected || isInProjectionRange;

      // projectedValue: number for line mode, [min, max] for area mode
      let projectedValue: number | [number, number] | null = null;
      if (shouldShowProjection) {
        projectedValue =
          projectionStyle === "area"
            ? [Math.round(point.value * 0.75), Math.round(point.value * 1.25)]
            : point.value;
      }

      return {
        label: point.label,
        actualValue: !point.isProjected ? point.value : null,
        projectedValue,
        isProjected: point.isProjected,
      };
    });
  }, [data, projectionStyle]);

  const hasProjectedData = data.some((d) => d.isProjected);

  // Generate unique IDs for gradients to avoid conflicts between multiple cards
  const gradientId = useMemo(
    () => `fillValue-${title.replace(/\s+/g, "-").toLowerCase()}`,
    [title],
  );
  const projectedGradientId = useMemo(
    () => `fillProjected-${title.replace(/\s+/g, "-").toLowerCase()}`,
    [title],
  );

  const chartConfig: ChartConfig = {
    actualValue: {
      label: title,
      color,
    },
    projectedValue: {
      label: `${title} (Projected)`,
      color,
    },
  };

  const formattedValue =
    typeof value === "number" ? value.toLocaleString("en-US") : value;

  return (
    <div
      className={cn(
        "flex-1 rounded-xl border border-border bg-card p-5",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-medium text-muted-foreground">{title}</span>
        {hasProjectedData && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
            {projectionStyle === "area" ? "±25%" : "Projected"}
          </span>
        )}
      </div>

      {/* Content - Stats and Chart side by side */}
      <div className="flex flex-col gap-4 lg:flex-col lg:items-stretch xl:flex-row xl:items-end xl:justify-between min-[520px]:flex-row min-[520px]:items-end min-[520px]:justify-between">
        {/* Stats Section */}
        <div className="space-y-4 min-[520px]:space-y-6">
          <p className="mt-2 font-semibold text-3xl tracking-tight">
            {formattedValue}
          </p>
          <div className="flex flex-col items-start gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex items-center gap-0.5",
                    isPositive ? "text-emerald-500" : "text-red-500",
                  )}
                >
                  {changePercent >= 0 ? (
                    <TrendingUp className="size-4" />
                  ) : (
                    <TrendingDown className="size-4" />
                  )}
                  <span className="font-semibold text-sm">
                    {Math.abs(changePercent)}%
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Compared to the period before {`(${periodLabel})`}</p>
              </TooltipContent>
            </Tooltip>
            <span className="text-muted-foreground text-sm">{periodLabel}</span>
          </div>
        </div>

        {/* Chart Section */}
        <div className="h-20 w-full lg:w-full xl:w-50 min-[520px]:w-50">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 8, right: 8 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(val) =>
                  typeof val === "string" ? val.slice(0, 3) : val
                }
                fontSize={10}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <defs>
                {/* Solid gradient for actual data */}
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-actualValue)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-actualValue)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                {/* Gradient for projected area */}
                {/* Dashed hatch pattern for projected data */}
                <pattern
                  id={projectedGradientId}
                  patternUnits="userSpaceOnUse"
                  width="4"
                  height="4"
                >
                  <path
                    d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2"
                    stroke="var(--color-projectedValue)"
                    strokeWidth="0.6"
                    strokeOpacity="0.4"
                  />
                </pattern>
              </defs>
              {/* Actual data area - solid line */}
              <Area
                dataKey="actualValue"
                type={lineType}
                fill={`url(#${gradientId})`}
                fillOpacity={0.4}
                stroke="var(--color-actualValue)"
                strokeWidth={2}
                connectNulls={false}
              />
              {/* Projected data - works for both number and [min, max] */}
              {hasProjectedData && (
                <Area
                  dataKey="projectedValue"
                  type={lineType}
                  fill={`url(#${projectedGradientId})`}
                  fillOpacity={projectionStyle === "area" ? 1 : 0.8}
                  stroke="var(--color-projectedValue)"
                  strokeWidth={projectionStyle === "area" ? 1 : 2}
                  strokeDasharray="4 4"
                  connectNulls={true}
                />
              )}
            </AreaChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
});
