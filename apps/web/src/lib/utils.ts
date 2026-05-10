import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ChartDataPoint } from "@/components/chart-data-card";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min?: number, max?: number): number {
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
}

export function snapValueToStep(
  value: number,
  min: number | undefined,
  max: number | undefined,
  step: number,
): number {
  const offset = min ?? 0;
  const remainder = (value - offset) % step;
  let snappedValue = value - remainder;

  if (Math.abs(remainder) * 2 >= step) {
    snappedValue += remainder > 0 ? step : -step;
  }

  return clamp(snappedValue, min, max);
}

export function handleDecimalOperation(
  operator: "+" | "-",
  value1: number,
  value2: number,
): number {
  let result = operator === "+" ? value1 + value2 : value1 - value2;

  if (value1 % 1 !== 0 || value2 % 1 !== 0) {
    const value1Decimal = value1.toString().split(".");
    const value2Decimal = value2.toString().split(".");
    const value1DecimalLength = value1Decimal[1]?.length || 0;
    const value2DecimalLength = value2Decimal[1]?.length || 0;
    const multiplier = 10 ** Math.max(value1DecimalLength, value2DecimalLength);

    const v1 = Math.round(value1 * multiplier);
    const v2 = Math.round(value2 * multiplier);
    result = operator === "+" ? v1 + v2 : v1 - v2;
    result /= multiplier;
  }

  return result;
}

/**
 * Fuzzy match helper - checks if search query matches target text
 * Case-insensitive and checks if all search terms appear in the target
 */
export function fuzzyMatch(searchQuery: string, targetText: string): boolean {
  if (!searchQuery.trim()) return true;

  const query = searchQuery.toLowerCase().trim();
  const target = targetText.toLowerCase();

  // Split query into words for better fuzzy matching
  const searchTerms = query.split(/\s+/);

  // All search terms must appear in the target
  return searchTerms.every((term) => target.includes(term));
}

/**
 * Get badge style classes based on status string
 * Supports various status types across the application
 */
export function getBadgeStyleByStatus(status: string): string {
  switch (status.toLowerCase()) {
    // 1. Pause / Wait States
    case "waiting":
    case "pending":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/60";

    // 2. Gatekeeping States (Administrative)
    // distinct from "Completed" to show it's ready for the next step
    case "approved":
    case "accepted":
      return "bg-cyan-500/10 text-cyan-500 border-cyan-500/60";

    // 3. Ongoing / Neutral States
    case "inbound":
    case "active":
    case "in progress":
    case "receiving":
    case "picking":
    case "processing":
      return "bg-blue-500/10 text-blue-500 border-blue-500/60";

    // 4. Success / Final States
    case "completed":
    case "complete":
    case "received":
    case "confirmed":
    case "picked":
      return "bg-green-500/10 text-green-500 border-green-500/60";

    // 5. Exception / Rework States
    // "Returned" is rarely "Active" - it usually implies a revision is needed
    case "returned":
    case "loading":
      return "bg-orange-500/10 text-orange-500 border-orange-500/60";

    // 6. Failure States
    case "rejected":
    case "cancelled":
    case "return requested":
      return "bg-red-500/10 text-red-500 border-red-500/60";

    // 7. Shipped / Archived States
    case "shipped":
    case "delivered":
      return "bg-slate-600/15 text-slate-500 border-slate-600/60";

    // 8. Neutral / Default
    default:
      return "bg-slate-500/10 text-slate-500 border-slate-500/60";
  }
}

/**
 * Brightens a hex color by mixing it with white
 * @param hex - Hex color string (e.g., "#FF6B6B" or "#F00")
 * @param amount - Amount to brighten (0-1), default 0.25
 * @returns Brightened hex color string
 */
export function brightenHex(hex: string, amount = 0.25): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = Number.parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const mix = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c + (255 - c) * amount)));
  const r2 = mix(r);
  const g2 = mix(g);
  const b2 = mix(b);
  return `#${[r2, g2, b2].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function darkenHex(hex: string, amount = 0.25): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = Number.parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const mix = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c - c * amount)));
  const r2 = mix(r);
  const g2 = mix(g);
  const b2 = mix(b);
  return `#${[r2, g2, b2].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function createTimeSeriesData<T>(
  dayLabels: string[],
  items: T[],
  filterFn: (item: T) => boolean,
  getDate: (item: T) => Date,
): ChartDataPoint[] {
  const countsByDay = new Map<string, number>();

  // Initialize all days with 0
  for (const label of dayLabels) {
    countsByDay.set(label, 0);
  }

  // Count items by day
  for (const item of items.filter(filterFn)) {
    const itemDate = getDate(item);
    const label = itemDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    countsByDay.set(label, (countsByDay.get(label) ?? 0) + 1);
  }

  return dayLabels.map((label) => ({
    label,
    value: countsByDay.get(label) ?? 0,
    isProjected: false,
  }));
}
